/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Http from 'http';
import Path from 'path';
import type { ToolingLog } from '@kbn/tooling-log';
import { harnessPaths } from './workspace';
import { reportTemplate } from './report_template';
import { costUsd } from './pricing';
import { verifyManifest } from './verification';
import type { ExampleRun, RunSummary } from './runner';

interface StoredRun {
  summary: Omit<RunSummary, 'runs'> & { configHash: string };
  variant?: { hash: string; tier?: string };
  runs: ExampleRun[];
}

interface LedgerEntry {
  round: number;
  rejected?: string;
  manifest?: {
    slots?: string[];
    rationale?: string;
    predictedFixes?: string[];
    predictedRegressions?: string[];
  };
  gate?: Record<string, unknown>;
  filesChanged?: string[];
  diff?: string;
  parentHash?: string;
  variantHash?: string;
}

const readJson = <T>(path: string): T | undefined => {
  try {
    return JSON.parse(Fs.readFileSync(path, 'utf8')) as T;
  } catch (e) {
    return undefined;
  }
};

const loadRuns = (runsDir: string) => {
  if (!Fs.existsSync(runsDir)) return [];
  const loaded: Array<{
    id: string;
    group: string;
    label: string;
    stored: StoredRun;
    mtimeMs: number;
  }> = [];

  for (const group of Fs.readdirSync(runsDir)) {
    const groupDir = Path.join(runsDir, group);
    if (!Fs.statSync(groupDir).isDirectory()) continue;
    for (const file of Fs.readdirSync(groupDir)) {
      if (!file.endsWith('.json')) continue;
      const stored = readJson<StoredRun>(Path.join(groupDir, file));
      if (!stored?.summary) continue;
      loaded.push({
        id: `${group}/${file.replace(/\.json$/, '')}`,
        group,
        label: file.replace(/\.json$/, ''),
        stored,
        mtimeMs: Fs.statSync(Path.join(groupDir, file)).mtimeMs,
      });
    }
  }

  return loaded.sort((a, b) => a.mtimeMs - b.mtimeMs);
};

/**
 * Runs recorded before cost was priced carry tokens but no USD. They all ran on the context's
 * default model, so the report prices them retroactively rather than showing a blank column —
 * marked as estimated wherever the connector is unknown.
 */
const LEGACY_DEFAULT_MODEL = 'gemini-3.5-flash-lite';

const backfillCost = (result: ExampleRun): number =>
  result.costUsd ??
  costUsd({
    modelOrConnectorId: result.connectorId ?? LEGACY_DEFAULT_MODEL,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  });

const meanBy = <T>(items: T[], pick: (item: T) => number): number =>
  items.length === 0 ? 0 : items.reduce((total, item) => total + pick(item), 0) / items.length;

/** Mean reward per example id, so two runs can be compared example by example. */
const rewardByExample = (runs: ExampleRun[]): Map<string, number> => {
  const totals = new Map<string, { sum: number; count: number }>();
  for (const run of runs) {
    const current = totals.get(run.exampleId) ?? { sum: 0, count: 0 };
    totals.set(run.exampleId, { sum: current.sum + run.score.reward, count: current.count + 1 });
  }
  return new Map([...totals].map(([id, { sum, count }]) => [id, sum / count]));
};

/**
 * Build everything the UI needs: a campaign timeline, per-round config diffs and per-seed
 * effects, a run browser, and a per-example history across every run.
 *
 * All of it is derived from the run files and the ledger, so the report is reproducible from a
 * campaign directory alone and re-rendering is a pure function of what is on disk.
 */
export const buildReportPayload = () => {
  const { runsDir, lineageDir } = harnessPaths();
  const runs = loadRuns(runsDir);
  const ledger = readJson<LedgerEntry[]>(Path.join(lineageDir, 'ledger.json')) ?? [];

  const runViews = runs.map(({ id, group, label, stored }) => {
    const results = (stored.runs ?? []).map((result) => ({
      ...result,
      costUsd: backfillCost(result),
    }));
    return {
      id,
      group,
      label,
      configHash: stored.summary.configHash,
      meanReward: stored.summary.meanReward,
      meanExecutes: stored.summary.meanExecutes,
      meanResultEquivalence: stored.summary.meanResultEquivalence,
      meanTries: stored.summary.meanTries,
      totalInputTokens: stored.summary.totalInputTokens,
      totalOutputTokens: stored.summary.totalOutputTokens,
      totalCostUsd:
        stored.summary.totalCostUsd ??
        results.reduce((total, result) => total + (result.costUsd ?? 0), 0),
      costEstimated: stored.summary.totalCostUsd === undefined,
      rewardByProvenance: stored.summary.rewardByProvenance ?? {},
      exampleCount: new Set(results.map((result) => result.exampleId)).size,
      models: [
        ...new Set(
          results
            .map((result) => (result.connectorId ?? '').replace('harness-opt-', ''))
            .filter(Boolean)
        ),
      ],
      results: results.map((result) => ({
        exampleId: result.exampleId,
        provenance: result.provenance,
        question: result.question,
        goldQuery: result.goldQuery,
        generatedQuery: result.generatedQuery,
        score: result.score,
        tries: result.tries,
        costUsd: result.costUsd,
        connectorId: result.connectorId,
      })),
    };
  });

  const byLabel = new Map(runViews.map((run) => [run.label, run]));

  const rounds = ledger.map((entry) => {
    const candidateRun = byLabel.get(`round${entry.round}-candidate-gate`);
    const incumbentRun = byLabel.get(`round${entry.round}-incumbent-gate`);
    const searchRun = byLabel.get(`round${entry.round}-incumbent-search`);

    const incumbentRewards = incumbentRun
      ? rewardByExample(incumbentRun.results as ExampleRun[])
      : new Map();
    const candidateRewards = candidateRun
      ? rewardByExample(candidateRun.results as ExampleRun[])
      : new Map();

    const seedDeltas = [...incumbentRewards.keys()]
      .filter((exampleId) => candidateRewards.has(exampleId))
      .map((exampleId) => {
        const example = (incumbentRun?.results ?? []).find(
          (result) => result.exampleId === exampleId
        );
        return {
          exampleId,
          question: example?.question ?? exampleId,
          provenance: example?.provenance ?? '',
          incumbent: incumbentRewards.get(exampleId) ?? 0,
          candidate: candidateRewards.get(exampleId) ?? 0,
          delta: (candidateRewards.get(exampleId) ?? 0) - (incumbentRewards.get(exampleId) ?? 0),
        };
      });

    return {
      round: entry.round,
      rejectedReason: entry.rejected,
      parentHash: entry.parentHash ?? 'base',
      configHash: entry.variantHash ?? `round-${entry.round}`,
      filesChanged: entry.filesChanged ?? [],
      diff: entry.diff ?? '',
      slots: entry.manifest?.slots ?? [],
      rationale: entry.manifest?.rationale ?? '',
      gate: entry.gate,
      seedDeltas,
      verification: entry.manifest
        ? verifyManifest({ manifest: entry.manifest, seedDeltas })
        : undefined,
      runs: [searchRun?.id, incumbentRun?.id, candidateRun?.id].filter(Boolean),
    };
  });

  // Per-example history across every run: the fastest way to see whether an example is simply
  // hard, or whether a particular config broke it.
  const examples = new Map<
    string,
    {
      exampleId: string;
      question: string;
      goldQuery: string;
      provenance: string;
      index?: string;
      difficulty?: string;
      split?: string;
      runs: number;
      meanReward: number;
      history: Array<Record<string, unknown>>;
    }
  >();

  for (const run of runViews) {
    for (const result of run.results) {
      const current = examples.get(result.exampleId) ?? {
        exampleId: result.exampleId,
        question: result.question,
        goldQuery: result.goldQuery,
        provenance: result.provenance,
        runs: 0,
        meanReward: 0,
        history: [],
      };
      current.history.push({
        runId: run.id,
        label: run.label,
        reward: result.score.reward,
        resultEquivalence: result.score.resultEquivalence,
        executes: result.score.executes,
        error: result.score.error,
        generatedQuery: result.generatedQuery,
        tries: result.tries,
        connectorId: result.connectorId,
      });
      current.meanReward =
        (current.meanReward * current.runs + result.score.reward) / (current.runs + 1);
      current.runs += 1;
      examples.set(result.exampleId, current);
    }
  }

  const sealedRuns = runViews
    .filter((run) => run.label === 'sealed')
    .map((run) => ({
      label: `${run.group} (${run.configHash})`,
      isBaseline: run.configHash === 'baseline',
      meanReward: run.meanReward,
      anchorReward: meanBy(
        run.results.filter((result) => result.provenance !== 'generated-corpus'),
        (result) => result.score.reward
      ),
      generatedReward: meanBy(
        run.results.filter((result) => result.provenance === 'generated-corpus'),
        (result) => result.score.reward
      ),
      totalCostUsd: run.totalCostUsd,
      costPerSolved:
        run.totalCostUsd /
        Math.max(
          run.results.reduce((t, r) => t + r.score.reward, 0),
          0.0001
        ),
    }));

  const baseHash = rounds.length ? rounds[0].parentHash : 'base';

  return {
    generatedAt: new Date().toISOString(),
    baseHash,
    rounds,
    runs: runViews,
    examples: [...examples.values()],
    exampleCount: examples.size,
    sealed: sealedRuns,
    totalCostUsd: runViews.reduce((total, run) => total + run.totalCostUsd, 0),
  };
};

export const renderReport = (): string =>
  reportTemplate(JSON.stringify(buildReportPayload()).replace(/</g, '\\u003c'));

export const writeReport = (): string => {
  const outputPath = Path.join(harnessPaths().root, 'report.html');
  Fs.writeFileSync(outputPath, renderReport());
  return outputPath;
};

/**
 * Serve the report, re-rendering on every request so a reload reflects a campaign that is still
 * running, and the same URL works from another machine.
 */
export const serveReport = ({
  host,
  port,
  log,
}: {
  host: string;
  port: number;
  log: ToolingLog;
}): Promise<void> =>
  new Promise((resolve, reject) => {
    const server = Http.createServer((request, response) => {
      if (request.url === '/health') {
        response.writeHead(200, { 'content-type': 'text/plain' });
        response.end('ok');
        return;
      }
      try {
        response.writeHead(200, {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store',
        });
        response.end(renderReport());
      } catch (e) {
        response.writeHead(500, { 'content-type': 'text/plain' });
        response.end(String((e as Error).message));
      }
    });

    server.on('error', reject);
    server.listen(port, host, () => {
      log.info(`[harness-opt] report on http://${host}:${port} — re-rendered per request`);
    });
    process.on('SIGINT', () => {
      server.close();
      resolve();
    });
  });
