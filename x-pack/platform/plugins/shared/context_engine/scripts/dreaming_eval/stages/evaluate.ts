/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import pLimit from 'p-limit';
import { runDirOf } from '../config';
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
import { sampleOfTarget, targetsOfRun } from '../targets';
import type { DumpedKi, EvalTarget, KiDump } from '../types';
import { dumpedSamplesOf, kiDumpFileOf, sampleDirOf } from './run';

export interface TargetResult extends Judgement {
  target: EvalTarget;
  /** The sample whose KIs were judged, when samples ran one at a time. */
  sample?: string;
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

/** The KIs a run dumped for an AI index: one set, or one per sample with that sample's targets. */
export const kiSetsOf = (
  runDir: string,
  targets: EvalTarget[]
): Array<{ sample?: string; kis: DumpedKi[]; targets: EvalTarget[] }> => {
  const samples = dumpedSamplesOf(runDir);
  if (samples.length === 0) {
    const file = kiDumpFileOf(runDir);
    if (!fs.existsSync(file)) {
      throw new Error(`No KI dump at ${file}: run the run stage first`);
    }
    return [{ kis: readJson<KiDump>(file).kis, targets }];
  }
  return samples.map((sample) => ({
    sample,
    kis: readJson<KiDump>(kiDumpFileOf(sampleDirOf(runDir, sample))).kis,
    targets: targets.filter((target) => sampleOfTarget(target) === sample),
  }));
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
    const sets = kiSetsOf(dir, targetsOfRun(context, aiIndex, dir));

    let fallbacks = 0;
    const rank = async (target: EvalTarget, kis: DumpedKi[]): Promise<DumpedKi[]> => {
      if (kis.length <= config.evaluate.candidates) {
        return kis;
      }
      const query = targetQuery(target);
      try {
        return await rankWithReranker(esClient, config.evaluate.rerank_inference_id, query, kis);
      } catch (error) {
        fallbacks++;
        log.warning(
          `Reranking ${target.id} with ${config.evaluate.rerank_inference_id} failed (${
            error instanceof Error ? error.message : String(error)
          }); ranking its KIs by shared words instead`
        );
        return rankByOverlap(query, kis);
      }
    };

    const total = sets.reduce((sum, { targets }) => sum + targets.length, 0);
    const kiCount = sets.reduce((sum, { kis }) => sum + kis.length, 0);
    log.info(
      `${aiIndex.id}: judging ${total} targets against ${kiCount} KIs${
        sets.length > 1 || sets[0]?.sample ? ` of ${sets.length} samples` : ''
      } with ${connectorId}`
    );
    let done = 0;
    const results = await Promise.all(
      sets.flatMap(({ sample, kis, targets }) =>
        targets.map((target) =>
          limit(async (): Promise<TargetResult> => {
            const candidates = (await rank(target, kis)).slice(0, config.evaluate.candidates);
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
            if (done % 10 === 0 || done === total) {
              log.info(`  ${done}/${total} judged`);
            }
            const judgement: Judgement =
              'error' in judged ? { verdict: 'error', kiIds: [], reason: judged.error } : judged;
            return { target, ...(sample && { sample }), candidateIds, ...judgement };
          })
        )
      )
    );

    const evaluation: Evaluation = {
      runId,
      aiIndexId: aiIndex.id,
      connectorId,
      ranker: `the ${config.evaluate.rerank_inference_id} reranker${
        fallbacks > 0 ? ` (shared words for ${fallbacks} of ${total} targets it failed on)` : ''
      }`,
      evaluatedAt: new Date().toISOString(),
      kis: kiCount,
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
