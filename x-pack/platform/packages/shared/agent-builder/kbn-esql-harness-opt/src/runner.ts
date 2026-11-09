/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { HarnessExample } from './dataset';
import type { HarnessTarget } from './clients';
import { executeGenerateEsql } from './clients';
import { executeGold, scoreQuery } from './scorers';
import type { QueryScore } from './scorers';
import { activeConfigPath, harnessPaths, writeActiveConfig } from './workspace';

export interface ExampleRun {
  exampleId: string;
  seedId: string;
  provenance: string;
  rollout: number;
  question: string;
  index?: string;
  goldQuery: string;
  goldExecutable: boolean;
  generatedQuery?: string;
  score: QueryScore;
  latencyMs: number;
  httpError?: string;
  /** From the in-process harness trace, when Kibana was started with tracing enabled. */
  tries?: number;
  inputTokens?: number;
  outputTokens?: number;
  attemptErrors?: string[];
  requestedKeywords?: string[];
  resolvedTarget?: string;
}

export interface RunSummary {
  label: string;
  configHash: string;
  runs: ExampleRun[];
  meanReward: number;
  meanExecutes: number;
  meanResultEquivalence: number;
  meanTries: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  meanLatencyMs: number;
  /** Mean reward split by provenance — the anchor set is reported separately on purpose. */
  rewardByProvenance: Record<string, { reward: number; count: number }>;
}

const mean = (values: number[]): number =>
  values.length === 0 ? 0 : values.reduce((total, value) => total + value, 0) / values.length;

const readTraceRecords = (tracePath: string): Map<string, Record<string, unknown>[]> => {
  const byQuestion = new Map<string, Record<string, unknown>[]>();
  if (!Fs.existsSync(tracePath)) {
    return byQuestion;
  }
  for (const line of Fs.readFileSync(tracePath, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const record = JSON.parse(line) as Record<string, unknown>;
      const key = String(record.nlQuery ?? '');
      byQuestion.set(key, [...(byQuestion.get(key) ?? []), record]);
    } catch (e) {
      // a partially written line is not worth failing a round over
    }
  }
  return byQuestion;
};

const runWithConcurrency = async <T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
};

/** Gold rows are reused across rollouts and configs — one execution per example per run session. */
export const buildGoldRowCache = async ({
  esClient,
  examples,
}: {
  esClient: EsClient;
  examples: HarnessExample[];
}): Promise<Map<string, string[] | null>> => {
  const cache = new Map<string, string[] | null>();
  for (const example of examples) {
    const { rows } = await executeGold(esClient, example.goldQuery);
    cache.set(example.id, rows);
  }
  return cache;
};

export const runConfig = async ({
  label,
  config,
  examples,
  rollouts,
  esClient,
  target,
  log,
  concurrency = 4,
  goldRows,
  outputDir,
}: {
  label: string;
  config: Record<string, unknown>;
  examples: HarnessExample[];
  rollouts: number;
  esClient: EsClient;
  target: HarnessTarget;
  log: ToolingLog;
  concurrency?: number;
  goldRows: Map<string, string[] | null>;
  outputDir: string;
}): Promise<RunSummary> => {
  const { tracePath } = harnessPaths();
  const configHash = writeActiveConfig(config);
  log.info(
    `[harness-opt] running "${label}" (config ${configHash}) over ${examples.length} examples × ${rollouts} rollouts`
  );

  // Kibana re-reads the active config file on mtime change, so the only thing a round has to do
  // between candidates is rewrite it — no restart, no Scout reboot.
  if (Fs.existsSync(tracePath)) {
    Fs.truncateSync(tracePath, 0);
  }

  const work = examples.flatMap((example) =>
    Array.from({ length: rollouts }, (unused, rollout) => ({ example, rollout }))
  );

  const runs: ExampleRun[] = await runWithConcurrency(
    work,
    concurrency,
    async ({ example, rollout }) => {
      const result = await executeGenerateEsql({
        target,
        question: example.question,
        index: example.index,
      });
      const score = await scoreQuery({
        esClient,
        query: result.esql,
        goldRows: goldRows.get(example.id) ?? null,
      });

      return {
        exampleId: example.id,
        seedId: example.seedId,
        provenance: example.provenance,
        rollout,
        question: example.question,
        index: example.index,
        goldQuery: example.goldQuery,
        goldExecutable: (goldRows.get(example.id) ?? null) !== null,
        generatedQuery: result.esql,
        score,
        latencyMs: result.latencyMs,
        httpError: result.httpError,
      } satisfies ExampleRun;
    }
  );

  const traces = readTraceRecords(tracePath);
  for (const run of runs) {
    const records = traces.get(run.question) ?? [];
    const record = records[run.rollout] ?? records[0];
    if (!record) continue;
    run.tries = record.tries as number;
    run.inputTokens = record.inputTokens as number;
    run.outputTokens = record.outputTokens as number;
    run.requestedKeywords = record.requestedKeywords as string[];
    run.resolvedTarget = record.target as string;
    run.attemptErrors = ((record.attempts as Array<{ error?: string }>) ?? [])
      .map((attempt) => attempt.error)
      .filter((error): error is string => Boolean(error));
  }

  const summary: RunSummary = {
    label,
    configHash,
    runs,
    meanReward: mean(runs.map((run) => run.score.reward)),
    meanExecutes: mean(runs.map((run) => (run.score.executes ? 1 : 0))),
    meanResultEquivalence: mean(
      runs
        .filter((run) => run.score.resultEquivalence !== null)
        .map((run) => run.score.resultEquivalence as number)
    ),
    meanTries: mean(runs.map((run) => run.tries ?? 0)),
    totalInputTokens: runs.reduce((total, run) => total + (run.inputTokens ?? 0), 0),
    totalOutputTokens: runs.reduce((total, run) => total + (run.outputTokens ?? 0), 0),
    meanLatencyMs: mean(runs.map((run) => run.latencyMs)),
    rewardByProvenance: Object.fromEntries(
      [...new Set(runs.map((run) => run.provenance))].map((provenance) => {
        const subset = runs.filter((run) => run.provenance === provenance);
        return [
          provenance,
          { reward: mean(subset.map((run) => run.score.reward)), count: subset.length },
        ];
      })
    ),
  };

  Fs.mkdirSync(outputDir, { recursive: true });
  Fs.writeFileSync(
    Path.join(outputDir, `${label}.json`),
    JSON.stringify({ summary: { ...summary, runs: undefined }, config, runs }, null, 2)
  );
  log.info(
    `[harness-opt] "${label}": reward ${summary.meanReward.toFixed(
      3
    )}, executes ${summary.meanExecutes.toFixed(
      2
    )}, resultEq ${summary.meanResultEquivalence.toFixed(3)}, tries ${summary.meanTries.toFixed(
      2
    )}, tokens ${summary.totalInputTokens}/${
      summary.totalOutputTokens
    }, active config ${activeConfigPath()}`
  );

  return summary;
};
