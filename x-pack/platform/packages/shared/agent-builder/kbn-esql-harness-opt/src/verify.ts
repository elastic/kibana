/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFile } from 'child_process';
import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import { promisify } from 'util';
import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { HarnessTarget } from './clients';
import type { HarnessExample } from './dataset';
import { buildGoldRowCache, runVariant } from './runner';
import type { RunSummary } from './runner';
import { gateCandidate } from './gate';
import { restartLane, treeHash } from './candidate_workspace';
import { harnessPaths } from './workspace';

const execFileAsync = promisify(execFile);

const TOOL_DIR =
  'x-pack/platform/packages/shared/agent-builder/agent-builder-genai-utils/tools/generate_esql';

/**
 * Snapshot the tool directory to a temp dir and restore it afterwards.
 *
 * Deliberately not `git stash`: the stash is shared across every worktree of a repository, so a
 * stash/pop pair here popped an unrelated worktree's entry and left conflicts in files this
 * experiment never touched. Copying the directory is boring and cannot reach outside itself.
 */
const snapshotTool = (worktree: string): { restore: () => void; path: string } => {
  const source = Path.join(worktree, TOOL_DIR);
  const backup = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'harness-tool-'));
  Fs.cpSync(source, backup, { recursive: true });
  return {
    path: backup,
    restore: () => {
      Fs.rmSync(source, { recursive: true, force: true });
      Fs.cpSync(backup, source, { recursive: true });
      Fs.rmSync(backup, { recursive: true, force: true });
    },
  };
};

const pool = (runs: RunSummary[], label: string): RunSummary => ({
  label,
  configHash: label,
  runs: runs.flatMap((run) => run.runs),
  meanReward:
    runs.flatMap((run) => run.runs).reduce((total, run) => total + run.score.reward, 0) /
    Math.max(runs.flatMap((run) => run.runs).length, 1),
  meanExecutes: runs.reduce((total, run) => total + run.meanExecutes, 0) / runs.length,
  meanResultEquivalence:
    runs.reduce((total, run) => total + run.meanResultEquivalence, 0) / runs.length,
  meanTries: runs.reduce((total, run) => total + run.meanTries, 0) / runs.length,
  totalInputTokens: runs.reduce((total, run) => total + run.totalInputTokens, 0),
  totalOutputTokens: runs.reduce((total, run) => total + run.totalOutputTokens, 0),
  totalCostUsd: runs.reduce((total, run) => total + run.totalCostUsd, 0),
  meanLatencyMs: runs.reduce((total, run) => total + run.meanLatencyMs, 0) / runs.length,
  rewardByProvenance: runs[0]?.rewardByProvenance ?? {},
});

const provenanceTable = (summary: RunSummary): Record<string, number> => {
  const byProvenance: Record<string, { sum: number; count: number }> = {};
  for (const run of summary.runs) {
    const current = byProvenance[run.provenance] ?? { sum: 0, count: 0 };
    byProvenance[run.provenance] = {
      sum: current.sum + run.score.reward,
      count: current.count + 1,
    };
  }
  return Object.fromEntries(
    Object.entries(byProvenance).map(([provenance, { sum, count }]) => [provenance, sum / count])
  );
};

/**
 * The after-campaign check: does what the loop accepted survive on data it never optimized
 * against?
 *
 * Both sides are measured in the same session, repeated, and compared with the same paired
 * bootstrap the gate uses. Repetition is not optional — two runs of *identical* code differed by
 * 0.022 reward here, which is the same order as the effects being claimed, so a single run of
 * each side cannot tell a gain from noise.
 */
export const verifySealed = async ({
  worktree,
  baselineRef,
  repeats,
  rollouts,
  concurrency,
  examples,
  esClient,
  target,
  restartCommand,
  log,
}: {
  worktree: string;
  /** Git ref whose version of the tool is the comparison baseline. */
  baselineRef: string;
  repeats: number;
  rollouts: number;
  concurrency: number;
  examples: HarnessExample[];
  esClient: EsClient;
  target: HarnessTarget;
  restartCommand: string;
  log: ToolingLog;
}): Promise<void> => {
  const { runsDir, lineageDir } = harnessPaths();
  const outputDir = Path.join(runsDir, `verify-${Date.now()}`);
  const goldRows = await buildGoldRowCache({ esClient, examples });
  const currentHash = treeHash(worktree);

  const measure = async (label: string, hash: string): Promise<RunSummary[]> => {
    const summaries: RunSummary[] = [];
    for (let repeat = 0; repeat < repeats; repeat++) {
      summaries.push(
        await runVariant({
          label: `${label}-${repeat}`,
          variant: { hash },
          lane: 'incumbent',
          examples,
          rollouts,
          esClient,
          target,
          log,
          concurrency,
          goldRows,
          outputDir,
        })
      );
    }
    return summaries;
  };

  log.info(`[verify] measuring the current harness (${currentHash}), ${repeats} repeat(s)`);
  const candidateRuns = await measure('sealed-current', currentHash);

  const snapshot = snapshotTool(worktree);
  let baselineRuns: RunSummary[];
  try {
    await execFileAsync('git', ['checkout', baselineRef, '--', TOOL_DIR], { cwd: worktree });
    await restartLane({ command: restartCommand, url: target.kibanaUrl, log });
    log.info(`[verify] measuring the baseline (${baselineRef}, ${treeHash(worktree)})`);
    baselineRuns = await measure('sealed-baseline', treeHash(worktree));
  } finally {
    snapshot.restore();
    await restartLane({ command: restartCommand, url: target.kibanaUrl, log });
  }

  const candidate = pool(candidateRuns, 'current');
  const baseline = pool(baselineRuns, 'baseline');
  const result = gateCandidate({ incumbent: baseline, candidate });

  const candidateByProvenance = provenanceTable(candidate);
  const baselineByProvenance = provenanceTable(baseline);

  const lines = [
    `# Held-out check — ${new Date().toISOString()}`,
    '',
    `Split: ${examples.length} examples · ${repeats} repeat(s) × ${rollouts} rollout(s) per side`,
    `Current: ${currentHash} · baseline: ${baselineRef}`,
    '',
    '| metric | baseline | current | Δ |',
    '|---|---|---|---|',
    `| reward | ${baseline.meanReward.toFixed(3)} | ${candidate.meanReward.toFixed(3)} | ${
      (candidate.meanReward - baseline.meanReward >= 0 ? '+' : '') +
      (candidate.meanReward - baseline.meanReward).toFixed(3)
    } |`,
    ...Object.keys({ ...baselineByProvenance, ...candidateByProvenance }).map((provenance) => {
      const before = baselineByProvenance[provenance] ?? 0;
      const after = candidateByProvenance[provenance] ?? 0;
      return `| ${provenance} | ${before.toFixed(3)} | ${after.toFixed(3)} | ${
        (after - before >= 0 ? '+' : '') + (after - before).toFixed(3)
      } |`;
    }),
    `| cost (USD) | ${baseline.totalCostUsd.toFixed(3)} | ${candidate.totalCostUsd.toFixed(
      3
    )} | ${result.costRatio.toFixed(2)}× |`,
    `| $ per solved | ${result.incumbentCostPerSolved.toFixed(
      4
    )} | ${result.candidateCostPerSolved.toFixed(4)} | |`,
    '',
    `Paired bootstrap over seeds: Δreward **${result.meanDelta.toFixed(
      3
    )}**, 95% CI [${result.ciLow.toFixed(3)}, ${result.ciHigh.toFixed(3)}]`,
    `Seeds improved: ${result.improvements.length} · regressed: ${result.regressions.length}`,
    '',
    result.ciLow > 0
      ? 'The gain survives on data the proposer never saw.'
      : 'No held-out gain: the confidence interval includes zero.',
    '',
  ];

  const reportPath = Path.join(lineageDir, `held-out-check-${Date.now()}.md`);
  Fs.writeFileSync(reportPath, lines.join('\n'));
  log.info(`\n${lines.join('\n')}`);
  log.info(`[verify] written to ${reportPath}`);
};
