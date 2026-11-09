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
import { buildGoldRowCache, runVariant } from './runner';
import type { RunSummary } from './runner';
import { gateCandidate } from './gate';
import type { GateResult } from './gate';
import { proposeCandidate } from './proposer';
import { reviewEdits } from './review';
import { verificationSummary, verifyManifest } from './verification';
import { harnessPaths } from './workspace';
import {
  applyAndValidateEdits,
  candidateDiff,
  collectEdits,
  promoteEdits,
  resetCandidate,
  restartLane,
  treeHash,
} from './candidate_workspace';
import type { CodeEdit } from './candidate_workspace';

export interface CampaignOptions {
  rounds: number;
  rollouts: number;
  concurrency: number;
  /**
   * Model the whole campaign runs on, pinned per lane at restart. Cross-model verification is a
   * separate, slower step (`verify-tiers`): pinning a model costs a restart of both lanes, so
   * doing it inside every round would double the wall clock of the loop for a check that only
   * matters at promotion time.
   */
  tier?: string;
  incumbentTarget: HarnessTarget;
  candidateTarget: HarnessTarget;
  candidateWorktree: string;
  mainWorktree: string;
  esClient: EsClient;
  /** Shell commands that restart each lane's Kibana so edited files are actually loaded. */
  restartCommands: { incumbent: string; candidate: string };
  searchExamples: HarnessExample[];
  gateExamples: HarnessExample[];
  log: ToolingLog;
}

const measuredFacts = (searchRun: RunSummary, lastFeedback: string): string =>
  [
    '# Measured facts about this harness',
    '',
    `- On the search split the harness needed ${searchRun.meanTries.toFixed(
      2
    )} generation attempts on average and ${(searchRun.meanExecutes * 100).toFixed(
      0
    )}% of queries executed without an Elasticsearch error.`,
    '- A matched-compute baseline measured `maxRetries` 1, 3 and 5 as indistinguishable, so the',
    '  retry loop and the wording of error feedback have little surface here: the failures are',
    '  semantic (wrong rows), not syntactic.',
    `- Mean result equivalence is ${searchRun.meanResultEquivalence.toFixed(
      3
    )} against near-perfect execution, so the whole gap is in producing the right rows.`,
    '- Cost is priced per model in USD. A cheaper model can win on the cost path at equal quality,',
    '  and an expensive one has to earn its price in reward.',
    '',
    lastFeedback ? `# How your last proposal turned out\n\n${lastFeedback}` : '',
  ].join('\n');

/**
 * One propose → validate → gate → promote cycle, repeated.
 *
 * A harness variant is a set of file edits inside the tool, nothing else: no config object, no
 * override layer. The incumbent runs from one worktree, the candidate from a second one with its
 * own Kibana, and a candidate only becomes the incumbent by beating it on held-out examples, on
 * every model tier, without losing more than two seeds.
 */
export const runCampaign = async ({
  rounds,
  rollouts,
  concurrency,
  tier,
  incumbentTarget,
  candidateTarget,
  candidateWorktree,
  mainWorktree,
  esClient,
  restartCommands,
  searchExamples,
  gateExamples,
  log,
}: CampaignOptions): Promise<void> => {
  const { runsDir, lineageDir } = harnessPaths();
  Fs.mkdirSync(lineageDir, { recursive: true });
  const ledgerPath = Path.join(lineageDir, 'ledger.json');
  const ledger: unknown[] = Fs.existsSync(ledgerPath)
    ? (JSON.parse(Fs.readFileSync(ledgerPath, 'utf8')) as unknown[])
    : [];
  const saveLedger = () => Fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));

  const searchGold = await buildGoldRowCache({ esClient, examples: searchExamples });
  const gateGold = await buildGoldRowCache({ esClient, examples: gateExamples });

  const workspace = { path: candidateWorktree, kibanaUrl: candidateTarget.kibanaUrl };
  const laneEnv: Record<string, string> = tier ? { ESQL_HARNESS_MODEL_CONNECTOR: tier } : {};

  // Continue from whatever the incumbent worktree already is — a previous campaign's accepted
  // variants live there, and starting from an empty diff would relabel them as "base" and
  // re-explore ground that was already won.
  let incumbentEdits: CodeEdit[] = await collectEdits({
    path: mainWorktree,
    kibanaUrl: incumbentTarget.kibanaUrl,
  });
  let incumbentDiff = await candidateDiff({
    path: mainWorktree,
    kibanaUrl: incumbentTarget.kibanaUrl,
  });
  let lastFeedback = '';

  // Rounds from earlier campaigns stay in the ledger; a campaign id keeps their numbering apart.
  const campaignId = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, '')
    .slice(0, 14);
  const priorRounds = ledger.length;
  log.info(
    `[harness-opt] campaign ${campaignId} starting from variant ${treeHash(mainWorktree)}${
      incumbentEdits.length ? ` (${incumbentEdits.length} file(s) already changed)` : ' (clean)'
    }`
  );

  for (let roundInCampaign = 0; roundInCampaign < rounds; roundInCampaign++) {
    const round = priorRounds + roundInCampaign;
    const outputDir = Path.join(runsDir, `round-${Date.now()}`);
    const incumbentVariant = { hash: treeHash(mainWorktree), diff: incumbentDiff };

    const searchRun = await runVariant({
      label: `round${round}-incumbent-search`,
      variant: incumbentVariant,
      lane: 'incumbent',
      examples: searchExamples,
      rollouts,
      esClient,
      target: incumbentTarget,
      log,
      concurrency,
      goldRows: searchGold,
      outputDir,
    });

    // The candidate always starts from the incumbent's code, so accepted edits accumulate.
    await resetCandidate(workspace);
    promoteEdits({ edits: incumbentEdits, targetWorktree: workspace.path });

    let proposal;
    try {
      proposal = await proposeCandidate({
        summary: searchRun,
        history: ledger,
        feedback: measuredFacts(searchRun, lastFeedback),
        scratchDir: Path.join(workspace.path, '.harness-scratch'),
        workingDir: workspace.path,
        log,
      });
    } catch (e) {
      log.warning(`[harness-opt] round ${round} proposer failed: ${(e as Error).message}`);
      ledger.push({
        round,
        campaignId,
        parentHash: incumbentVariant.hash,
        rejected: 'proposer-failed',
        error: (e as Error).message,
      });
      saveLedger();
      continue;
    }

    const codeEdits = await collectEdits(workspace);
    if (codeEdits.length === 0) {
      log.warning(`[harness-opt] round ${round} produced no file changes`);
      ledger.push({
        round,
        campaignId,
        parentHash: incumbentVariant.hash,
        rejected: 'no-edits',
        manifest: proposal.manifest,
      });
      saveLedger();
      continue;
    }

    const attemptedDiff = await candidateDiff(workspace);

    // Judgement first, mechanics second: a cheating edit that compiles is worse than one that
    // does not, so the reviewer sees the diff before any time is spent validating or measuring.
    const review = await reviewEdits({
      diff: attemptedDiff,
      scratchDir: Path.join(workspace.path, '.harness-scratch', 'review'),
      log,
    });
    if (review.verdict === 'block') {
      log.warning(`[harness-opt] reviewer blocked the edit: ${review.reasons.join('; ')}`);
      ledger.push({
        round,
        campaignId,
        parentHash: incumbentVariant.hash,
        rejected: 'review',
        failures: review.reasons,
        gate: { accepted: false, reasons: review.reasons },
        manifest: proposal.manifest,
        filesChanged: codeEdits.map((edit) => edit.path),
        diff: attemptedDiff.slice(0, 40_000),
      });
      saveLedger();
      lastFeedback = `Your last edit was blocked by the reviewer: ${review.reasons.join(
        '; '
      )}. Propose something that improves the tool for any user, not for this benchmark.`;
      await resetCandidate(workspace);
      continue;
    }

    const validation = await applyAndValidateEdits({ workspace, edits: codeEdits, log });
    if (!validation.ok) {
      log.warning(`[harness-opt] edits rejected: ${validation.failures.join(' | ').slice(0, 500)}`);
      ledger.push({
        round,
        campaignId,
        parentHash: incumbentVariant.hash,
        rejected: 'validation',
        failures: validation.failures.map((failure) => failure.slice(0, 2000)),
        manifest: proposal.manifest,
        filesChanged: codeEdits.map((edit) => edit.path),
        diff: attemptedDiff.slice(0, 40_000),
      });
      saveLedger();
      // Without this the next round proposes the same blocked edit again — twice in a row is
      // what the ledger showed before the failure was fed back.
      lastFeedback = `Your last edit (${codeEdits
        .map((edit) => edit.path.split('generate_esql/').pop())
        .join(', ')}) never reached the gate: ${validation.failures
        .join(' ')
        .slice(0, 400)}. Do not repeat it; either satisfy the rule or change something else.`;
      await resetCandidate(workspace);
      continue;
    }

    const diff = await candidateDiff(workspace);
    const candidateVariant = { hash: treeHash(workspace.path), diff };
    const candidateReady = await restartLane({
      command: restartCommands.candidate,
      url: workspace.kibanaUrl,
      env: laneEnv,
      log,
    });
    if (!candidateReady) {
      // Measuring a lane that did not restart compares the incumbent against itself and reports
      // a null result, which is worse than no round at all.
      ledger.push({
        round,
        campaignId,
        parentHash: incumbentVariant.hash,
        rejected: 'candidate-restart-failed',
        manifest: proposal.manifest,
      });
      saveLedger();
      await resetCandidate(workspace);
      continue;
    }

    const incumbentGate = await runVariant({
      label: `round${round}-incumbent-gate`,
      variant: { ...incumbentVariant, tier },
      lane: 'incumbent',
      examples: gateExamples,
      rollouts: Math.max(rollouts, 2),
      esClient,
      target: incumbentTarget,
      log,
      concurrency,
      goldRows: gateGold,
      outputDir,
    });

    const candidateGate = await runVariant({
      label: `round${round}-candidate-gate`,
      variant: { ...candidateVariant, tier },
      lane: 'candidate',
      examples: gateExamples,
      rollouts: Math.max(rollouts, 2),
      esClient,
      target: candidateTarget,
      log,
      concurrency,
      goldRows: gateGold,
      outputDir,
    });

    const gateResult: GateResult = gateCandidate({
      incumbent: incumbentGate,
      candidate: candidateGate,
    });
    const lastIncumbentGate = incumbentGate;
    const lastCandidateGate = candidateGate;

    const incumbentRuns = lastIncumbentGate.runs;
    const candidateRuns = lastCandidateGate.runs;
    const gateDeltas = [...new Set(incumbentRuns.map((entry) => entry.exampleId))].map(
      (exampleId) => {
        const rewardFor = (entries: typeof incumbentRuns) => {
          const subset = entries.filter((entry) => entry.exampleId === exampleId);
          return subset.length
            ? subset.reduce((total, entry) => total + entry.score.reward, 0) / subset.length
            : 0;
        };
        const example = incumbentRuns.find((entry) => entry.exampleId === exampleId);
        return {
          exampleId,
          question: example?.question ?? exampleId,
          provenance: example?.provenance ?? '',
          incumbent: rewardFor(incumbentRuns),
          candidate: rewardFor(candidateRuns),
          delta: rewardFor(candidateRuns) - rewardFor(incumbentRuns),
        };
      }
    );

    // The proposal predicts fixes for failures it read in the bundle, and the bundle is the
    // search split — so the predictions have to be checked there. Verifying them against gate
    // seeds (a disjoint set) made confirmation impossible by construction and reported every
    // proposal as 0/5, including the two that genuinely improved the harness.
    const candidateSearch = await runVariant({
      label: `round${round}-candidate-search`,
      variant: candidateVariant,
      lane: 'candidate',
      examples: searchExamples,
      rollouts,
      esClient,
      target: candidateTarget,
      log,
      concurrency,
      goldRows: searchGold,
      outputDir,
    });

    const searchDeltas = [...new Set(searchRun.runs.map((entry) => entry.exampleId))].map(
      (exampleId) => {
        const rewardFor = (entries: typeof searchRun.runs) => {
          const subset = entries.filter((entry) => entry.exampleId === exampleId);
          return subset.length
            ? subset.reduce((total, entry) => total + entry.score.reward, 0) / subset.length
            : 0;
        };
        const example = searchRun.runs.find((entry) => entry.exampleId === exampleId);
        return {
          exampleId,
          question: example?.question ?? exampleId,
          provenance: example?.provenance ?? '',
          incumbent: rewardFor(searchRun.runs),
          candidate: rewardFor(candidateSearch.runs),
          delta: rewardFor(candidateSearch.runs) - rewardFor(searchRun.runs),
        };
      }
    );

    const verification = verifyManifest({ manifest: proposal.manifest, seedDeltas: searchDeltas });
    lastFeedback = `${verificationSummary(verification)} The edit was ${
      gateResult.accepted ? 'accepted' : `rejected because: ${gateResult.reasons.join('; ')}`
    }.`;

    log.info(
      `[harness-opt] round ${round}: Δreward ${gateResult.meanDelta.toFixed(
        3
      )} [${gateResult.ciLow.toFixed(3)}, ${gateResult.ciHigh.toFixed(
        3
      )}], $/solved ${gateResult.incumbentCostPerSolved.toFixed(
        4
      )} → ${gateResult.candidateCostPerSolved.toFixed(4)}, regressions ${
        gateResult.regressions.length
      } → ${gateResult.accepted ? `ACCEPTED via ${gateResult.acceptedVia}` : 'rejected'}`
    );

    ledger.push({
      round,
      campaignId,
      manifest: proposal.manifest,
      verification,
      filesChanged: codeEdits.map((edit) => edit.path),
      diff: diff.slice(0, 40_000),
      parentHash: incumbentVariant.hash,
      variantHash: candidateVariant.hash,
      gate: gateResult,
      gateDeltas,
      tier,
      searchReward: searchRun.meanReward,
      candidateSearchReward: candidateSearch.meanReward,
      searchDeltas,
    });
    saveLedger();

    if (gateResult.accepted) {
      incumbentEdits = codeEdits;
      incumbentDiff = diff;
      const acceptedDir = Path.join(lineageDir, `accepted-${round}-${candidateVariant.hash}`);
      Fs.mkdirSync(acceptedDir, { recursive: true });
      Fs.writeFileSync(Path.join(acceptedDir, 'variant.diff'), diff);
      // Lock it in: the incumbent process runs this code from now on.
      promoteEdits({ edits: codeEdits, targetWorktree: mainWorktree });
      await restartLane({
        command: restartCommands.incumbent,
        url: incumbentTarget.kibanaUrl,
        env: laneEnv,
        log,
      });
      log.info(`[harness-opt] round ${round} promoted to incumbent`);
    } else {
      await resetCandidate(workspace);
    }
  }

  log.info(`[harness-opt] ledger: ${ledgerPath}`);
};
