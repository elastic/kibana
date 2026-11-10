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
import { readModelChoices } from './models';
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

interface LedgerEntry {
  round: number;
  model?: string;
  gate?: { accepted?: boolean };
}

/**
 * Which model each side of the check must run on.
 *
 * The model a variant runs on is part of the variant, not a setting of the measurement: round 9
 * was accepted *because* it paired a prose rule with a switch to a cheaper model. Measuring both
 * sides on one model therefore hands the baseline an improvement the campaign had to earn, and
 * the first run of this check did exactly that and reported "no held-out gain" for a chain whose
 * largest accepted step was the model.
 *
 * So the chain is replayed: the baseline runs on the model the first round started from, the
 * current harness on the model the last accepted round left behind. `--model` /
 * `--baseline-model` override a side explicitly; `code default` means "pin nothing".
 */
const modelsFromLedger = (lineageDir: string): { baseline?: string; current?: string } => {
  const path = Path.join(lineageDir, 'ledger.json');
  if (!Fs.existsSync(path)) return {};
  const ledger = JSON.parse(Fs.readFileSync(path, 'utf8')) as LedgerEntry[];
  const named = (model?: string): string | undefined =>
    model && model !== 'code default' ? model : undefined;

  const accepted = ledger.filter((entry) => entry.gate?.accepted);
  return {
    baseline: named(ledger[0]?.model),
    current: named(accepted[accepted.length - 1]?.model),
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
  baselineDir,
  repeats,
  rollouts,
  concurrency,
  examples,
  esClient,
  target,
  restartCommand,
  modelAlias,
  baselineModelAlias,
  log,
}: {
  worktree: string;
  /** Git ref whose version of the tool is the comparison baseline. */
  baselineRef: string;
  /**
   * Directory snapshot to use as the baseline instead of a git ref.
   *
   * Preferred: a campaign records what it started from, and that copy still contains the trace
   * writer. Checking out `origin/main` removes it, so the baseline reports zero tokens and the
   * cost comparison becomes meaningless (it reported a 3.6e15× cost ratio before this existed).
   */
  baselineDir?: string;
  repeats: number;
  rollouts: number;
  concurrency: number;
  examples: HarnessExample[];
  esClient: EsClient;
  target: HarnessTarget;
  restartCommand: string;
  /**
   * Model the current harness is measured on; defaults to the last accepted round's model.
   *
   * Pass this together with `baselineModelAlias` when the question is "does this prose help on
   * model X" rather than "is the harness better than what we started with" — one model on both
   * sides answers the first question and silently erases an accepted model switch in the second.
   */
  modelAlias?: string;
  /** Model the baseline is measured on; defaults to the model the campaign started from. */
  baselineModelAlias?: string;
  log: ToolingLog;
}): Promise<void> => {
  const { runsDir, lineageDir } = harnessPaths();
  const outputDir = Path.join(runsDir, `verify-${Date.now()}`);
  const fromLedger = modelsFromLedger(lineageDir);
  const currentModel = modelAlias ?? fromLedger.current;
  const baselineModel = baselineModelAlias ?? fromLedger.baseline;

  const connectorFor = (alias?: string): string | undefined =>
    alias
      ? readModelChoices().find(
          (choice) => choice.inferenceId.replace('harness-opt-', '') === alias
        )?.connectorId
      : undefined;

  for (const [side, alias] of [
    ['current', currentModel],
    ['baseline', baselineModel],
  ] as const) {
    if (alias && !connectorFor(alias)) {
      throw new Error(
        `[verify] no connector for the ${side} model "${alias}" — run setup-models, or name a model from ~/.esql-harness/models.json`
      );
    }
  }

  // An empty env is not the same as "leave the lane as it is": whatever the last run pinned is
  // still pinned, so a side that should run the code's own choice has to be restarted too.
  const laneEnvFor = (alias?: string): Record<string, string> => {
    const connectorId = connectorFor(alias);
    return connectorId ? { ESQL_HARNESS_MODEL_CONNECTOR: connectorId } : {};
  };

  log.info(
    `[verify] models — current: ${currentModel ?? 'code default'}, baseline: ${
      baselineModel ?? 'code default'
    }${modelAlias || baselineModelAlias ? ' (overridden)' : ' (from the ledger)'}`
  );

  await restartLane({
    command: restartCommand,
    url: target.kibanaUrl,
    env: laneEnvFor(currentModel),
    log,
  });
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
    if (baselineDir) {
      const toolPath = Path.join(worktree, TOOL_DIR);
      Fs.rmSync(toolPath, { recursive: true, force: true });
      Fs.cpSync(baselineDir, toolPath, { recursive: true });
    } else {
      await execFileAsync('git', ['checkout', baselineRef, '--', TOOL_DIR], { cwd: worktree });
    }
    await restartLane({
      command: restartCommand,
      url: target.kibanaUrl,
      env: laneEnvFor(baselineModel),
      log,
    });
    log.info(`[verify] measuring the baseline (${baselineRef}, ${treeHash(worktree)})`);
    baselineRuns = await measure('sealed-baseline', treeHash(worktree));
  } finally {
    snapshot.restore();
    // `git checkout <ref> -- <path>` also stages what it writes, so the index would stay dirty
    // with the baseline's version of files the restore has already put back.
    await execFileAsync('git', ['reset', '--quiet'], { cwd: worktree }).catch(() => undefined);
    // Leave the lane as the incumbent, on the incumbent's model — the next round starts here.
    await restartLane({
      command: restartCommand,
      url: target.kibanaUrl,
      env: laneEnvFor(currentModel),
      log,
    });
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
    `Current: ${currentHash} on ${currentModel ?? 'the code default model'} · baseline: ${
      baselineDir ?? baselineRef
    } on ${baselineModel ?? 'the code default model'}`,
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
