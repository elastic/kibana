/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import pLimit from 'p-limit';
import type { AiIndexEvalConfig } from '../config';
import { datasetDirOf, runDirOf } from '../config';
import type { StageContext } from '../context';
import { readJson, writeJson } from '../download';
import type { Judgement, ScoreLine } from '../judge';
import {
  judgePrompt,
  parseJudgement,
  rankByOverlap,
  rankWithReranker,
  scoreLine,
  SYSTEM_PROMPT,
  targetQuery,
} from '../judge';
import type { DumpedKi, EvalTarget, KiDump } from '../types';
import { generatedTargetsFileOf } from './extract';
import { kiDumpFileOf } from './run';

const JUDGE_TIMEOUT_MS = 180_000;
const JUDGE_ATTEMPTS = 2;
const DEFAULT_CONNECTOR_SETTING = 'genAiSettings:defaultAIConnector';

export interface TargetResult extends Judgement {
  target: EvalTarget;
  candidateIds: string[];
}

export interface Evaluation {
  runId: string;
  aiIndexId: string;
  connectorId: string;
  ranker: string;
  evaluatedAt: string;
  kis: number;
  overall: ScoreLine;
  byCategory: Record<string, ScoreLine>;
  byDataset: Record<string, ScoreLine>;
  results: TargetResult[];
}

export const evaluationFileOf = (dir: string): string => path.join(dir, 'evaluation.json');

/** The targets of an AI index: its own target files, else those extracted for its datasets. */
export const targetsOf = (context: StageContext, aiIndex: AiIndexEvalConfig): EvalTarget[] => {
  const files =
    aiIndex.targets.length > 0
      ? aiIndex.targets.map((file) => path.resolve(process.cwd(), file))
      : aiIndex.datasets.map((dataset) =>
          generatedTargetsFileOf(datasetDirOf(context.config, dataset))
        );
  return files.flatMap((file) => {
    if (!fs.existsSync(file)) {
      throw new Error(`No targets at ${file}: run the extract stage, or fix the targets path`);
    }
    return readJson<EvalTarget[]>(file);
  });
};

const resolveConnectorId = async (context: StageContext): Promise<string> => {
  const configured = context.judgeConnectorId ?? context.config.evaluate.connector_id;
  if (configured) {
    return configured;
  }
  const { data: settings } = await context.kibana<{
    settings: Record<string, { userValue?: unknown }>;
  }>('GET', '/internal/kibana/settings');
  const defaultConnector = settings.settings[DEFAULT_CONNECTOR_SETTING]?.userValue;
  if (typeof defaultConnector === 'string' && defaultConnector) {
    return defaultConnector;
  }
  const { data } = await context.kibana<{
    connectors: Array<{ connectorId: string; type: string }>;
  }>('GET', '/internal/inference/connectors');
  const connector = data.connectors.find(({ type }) => type === '.inference') ?? data.connectors[0];
  if (!connector) {
    throw new Error('No AI connector to judge with: pass --judge-connector');
  }
  return connector.connectorId;
};

const judge = async (
  context: StageContext,
  connectorId: string,
  target: EvalTarget,
  candidates: DumpedKi[]
): Promise<Judgement> => {
  const ids = candidates.map(({ id }) => id);
  let lastError = '';
  for (let attempt = 1; attempt <= JUDGE_ATTEMPTS; attempt++) {
    try {
      const { data } = await context.kibana<{ content?: string }>(
        'POST',
        '/internal/inference/chat_complete',
        {
          connectorId,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: judgePrompt(target, candidates) }],
          temperature: 0,
        },
        { timeoutMs: JUDGE_TIMEOUT_MS }
      );
      const judgement = parseJudgement(data.content ?? '', ids);
      if (judgement.verdict !== 'error') {
        return judgement;
      }
      lastError = judgement.reason;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  return { verdict: 'error', kiIds: [], reason: lastError };
};

const groupScores = (
  results: TargetResult[],
  keyOf: (result: TargetResult) => string
): Record<string, ScoreLine> => {
  const groups = new Map<string, TargetResult[]>();
  for (const result of results) {
    groups.set(keyOf(result), [...(groups.get(keyOf(result)) ?? []), result]);
  }
  return Object.fromEntries(
    [...groups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, group]) => [key, scoreLine(group.map(({ verdict }) => verdict))])
  );
};

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

export const summaryMarkdown = (evaluation: Evaluation): string => {
  const row = (name: string, line: ScoreLine) =>
    `| ${name} | ${line.targets} | ${line.covered} | ${line.partial} | ${line.missing} | ${
      line.errors
    } | ${percent(line.score)} |`;
  const table = (title: string, lines: Record<string, ScoreLine>) => [
    `## ${title}`,
    '',
    '| | Targets | Covered | Partial | Missing | Errors | Score |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...Object.entries(lines).map(([name, line]) => row(name, line)),
    '',
  ];
  const missed = evaluation.results.filter(({ verdict }) => verdict !== 'covered');
  return [
    `# Dreaming eval: ${evaluation.aiIndexId}, run ${evaluation.runId}`,
    '',
    `${evaluation.kis} KIs judged by \`${evaluation.connectorId}\`, candidates ranked by ${evaluation.ranker}. Covered counts 1 and partial 0.5.`,
    '',
    ...table('Overall', { all: evaluation.overall }),
    ...table('By dataset', evaluation.byDataset),
    ...table('By category', evaluation.byCategory),
    '## Not covered',
    '',
    ...missed.map(
      ({ target, verdict, reason }) =>
        `- **${verdict}** \`${target.id}\` (${target.category}): ${target.question
          .split('\n')[0]
          .slice(0, 160)} → ${target.answer.slice(0, 120)}. ${reason}`
    ),
    '',
  ].join('\n');
};

export const runEvaluate = async (context: StageContext): Promise<void> => {
  const { config, esClient, log, runId } = context;
  const connectorId = await resolveConnectorId(context);
  const limit = pLimit(config.evaluate.concurrency);
  for (const aiIndex of config.ai_indices.filter(({ id }) => context.aiIndexIds.includes(id))) {
    const dir = runDirOf(config, runId, aiIndex.id);
    const dumpFile = kiDumpFileOf(dir);
    if (!fs.existsSync(dumpFile)) {
      throw new Error(`${aiIndex.id}: no KI dump at ${dumpFile}: run the run stage first`);
    }
    const { kis } = readJson<KiDump>(dumpFile);
    const targets = targetsOf(context, aiIndex);

    let useReranker = true;
    const rank = async (target: EvalTarget): Promise<DumpedKi[]> => {
      if (kis.length <= config.evaluate.candidates) {
        return kis;
      }
      const query = targetQuery(target);
      if (useReranker) {
        try {
          return await rankWithReranker(esClient, config.evaluate.rerank_inference_id, query, kis);
        } catch (error) {
          log.warning(
            `Reranking with ${config.evaluate.rerank_inference_id} failed (${
              error instanceof Error ? error.message : String(error)
            }); ranking by shared words instead`
          );
          useReranker = false;
        }
      }
      return rankByOverlap(query, kis);
    };

    log.info(
      `${aiIndex.id}: judging ${targets.length} targets against ${kis.length} KIs with ${connectorId}`
    );
    let done = 0;
    const results = await Promise.all(
      targets.map((target) =>
        limit(async (): Promise<TargetResult> => {
          const candidates = (await rank(target)).slice(0, config.evaluate.candidates);
          const judgement = await judge(context, connectorId, target, candidates);
          done++;
          if (done % 10 === 0 || done === targets.length) {
            log.info(`  ${done}/${targets.length} judged`);
          }
          return { target, candidateIds: candidates.map(({ id }) => id), ...judgement };
        })
      )
    );

    const evaluation: Evaluation = {
      runId,
      aiIndexId: aiIndex.id,
      connectorId,
      ranker: useReranker ? `the ${config.evaluate.rerank_inference_id} reranker` : 'shared words',
      evaluatedAt: new Date().toISOString(),
      kis: kis.length,
      overall: scoreLine(results.map(({ verdict }) => verdict)),
      byCategory: groupScores(results, ({ target }) => target.category),
      byDataset: groupScores(results, ({ target }) => target.dataset),
      results,
    };
    writeJson(evaluationFileOf(dir), evaluation);
    fs.writeFileSync(path.join(dir, 'summary.md'), summaryMarkdown(evaluation));
    const { overall } = evaluation;
    log.success(
      `${aiIndex.id}: score ${percent(overall.score)} (${overall.covered} covered, ${
        overall.partial
      } partial, ${overall.missing} missing, ${overall.errors} errors of ${
        overall.targets
      }) → ${path.relative(process.cwd(), path.join(dir, 'summary.md'))}`
    );
    for (const [category, line] of Object.entries(evaluation.byCategory)) {
      log.info(`  ${category}: ${percent(line.score)} of ${line.targets}`);
    }
  }
};
