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
import type { Judgement } from '../judge';
import {
  judgePrompt,
  parseJudgement,
  rankByOverlap,
  rankWithReranker,
  SCORES,
  SYSTEM_PROMPT,
  targetQuery,
} from '../judge';
import { askJudge, resolveJudgeConnectorId } from '../llm';
import type { Scores } from '../report';
import { describeScore, scoresOf, scoreTables, shortQuestion } from '../report';
import type { DumpedKi, EvalTarget, KiDump } from '../types';
import { generatedTargetsFileOf } from './extract';
import { kiDumpFileOf } from './run';

export interface TargetResult extends Judgement {
  target: EvalTarget;
  candidateIds: string[];
}

export interface Evaluation extends Scores {
  runId: string;
  aiIndexId: string;
  connectorId: string;
  ranker: string;
  evaluatedAt: string;
  kis: number;
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

export const summaryMarkdown = (evaluation: Evaluation): string => {
  const missed = evaluation.results.filter(({ verdict }) => verdict !== 'covered');
  return [
    `# Dreaming eval: ${evaluation.aiIndexId}, run ${evaluation.runId}`,
    '',
    `Whether the ${evaluation.kis} KIs hold each target, judged by \`${evaluation.connectorId}\` on the KIs ranked highest by ${evaluation.ranker}. Covered counts 1 and partial 0.5.`,
    '',
    ...scoreTables(evaluation),
    '## Not covered',
    '',
    ...missed.map(
      ({ target, verdict, reason }) =>
        `- **${verdict}** \`${target.id}\` (${target.category}): ${shortQuestion(
          target
        )} → ${target.answer.slice(0, 120)}. ${reason}`
    ),
    '',
  ].join('\n');
};

export const runEvaluate = async (context: StageContext): Promise<void> => {
  const { config, esClient, log, runId } = context;
  const connectorId = await resolveJudgeConnectorId(context);
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
          const candidateIds = candidates.map(({ id }) => id);
          const judged = await askJudge<Judgement>({
            context,
            connectorId,
            system: SYSTEM_PROMPT,
            prompt: judgePrompt(target, candidates),
            parse: (content) => {
              const judgement = parseJudgement(content, candidateIds);
              return judgement.verdict === 'error' ? { error: judgement.reason } : judgement;
            },
          });
          done++;
          if (done % 10 === 0 || done === targets.length) {
            log.info(`  ${done}/${targets.length} judged`);
          }
          const judgement: Judgement =
            'error' in judged ? { verdict: 'error', kiIds: [], reason: judged.error } : judged;
          return { target, candidateIds, ...judgement };
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
      ...scoresOf(results, SCORES),
      results,
    };
    writeJson(evaluationFileOf(dir), evaluation);
    const summaryFile = path.join(dir, 'summary.md');
    fs.writeFileSync(summaryFile, summaryMarkdown(evaluation));
    log.success(
      `${aiIndex.id}: KIs hold ${describeScore(evaluation.overall)} → ${path.relative(
        process.cwd(),
        summaryFile
      )}`
    );
    for (const [category, line] of Object.entries(evaluation.byCategory)) {
      log.info(`  ${category}: ${describeScore(line)}`);
    }
  }
};
