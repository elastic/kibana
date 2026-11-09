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
import { verificationSummary, verifyManifest } from './verification';
import { harnessPaths, variantHash } from './workspace';
import { readModelChoices } from './models';
import {
  applyAndValidateEdits,
  candidateDiff,
  collectEdits,
  promoteEdits,
  resetCandidate,
  waitForKibana,
} from './candidate_workspace';
import type { CodeEdit } from './candidate_workspace';

export interface CampaignOptions {
  rounds: number;
  rollouts: number;
  concurrency: number;
  /** Connector ids the candidate must clear the gate on. Empty = whatever the code selects. */
  tiers: string[];
  incumbentTarget: HarnessTarget;
  candidateTarget: HarnessTarget;
  candidateWorktree: string;
  mainWorktree: string;
  esClient: EsClient;
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
  tiers,
  incumbentTarget,
  candidateTarget,
  candidateWorktree,
  mainWorktree,
  esClient,
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
  const tierList = tiers.length ? tiers : [undefined];

  let incumbentEdits: CodeEdit[] = [];
  let incumbentDiff = '';
  let lastFeedback = '';

  for (let round = 0; round < rounds; round++) {
    const outputDir = Path.join(runsDir, `round-${Date.now()}`);
    const incumbentVariant = { hash: variantHash(incumbentDiff), diff: incumbentDiff };

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
        modelChoices: readModelChoices(),
        log,
      });
    } catch (e) {
      log.warning(`[harness-opt] round ${round} proposer failed: ${(e as Error).message}`);
      ledger.push({ round, rejected: 'proposer-failed', error: (e as Error).message });
      saveLedger();
      continue;
    }

    const codeEdits = await collectEdits(workspace);
    if (codeEdits.length === 0) {
      log.warning(`[harness-opt] round ${round} produced no file changes`);
      ledger.push({ round, rejected: 'no-edits', manifest: proposal.manifest });
      saveLedger();
      continue;
    }

    const validation = await applyAndValidateEdits({ workspace, edits: codeEdits, log });
    if (!validation.ok) {
      log.warning(`[harness-opt] edits rejected: ${validation.failures.join(' | ').slice(0, 500)}`);
      ledger.push({
        round,
        rejected: 'validation',
        failures: validation.failures.map((failure) => failure.slice(0, 800)),
        manifest: proposal.manifest,
        filesChanged: codeEdits.map((edit) => edit.path),
      });
      saveLedger();
      await resetCandidate(workspace);
      continue;
    }

    const diff = await candidateDiff(workspace);
    const candidateVariant = { hash: variantHash(diff), diff };
    // The dev server reloads the edited files; measuring before it is back would score old code.
    await waitForKibana({ url: workspace.kibanaUrl, log });

    const tierResults: Array<{ tier: string; gate: GateResult }> = [];
    let lastIncumbentGate: RunSummary | undefined;
    let lastCandidateGate: RunSummary | undefined;

    for (const tier of tierList) {
      const suffix = tier ? `-${tier.slice(0, 8)}` : '';

      const incumbentGate = await runVariant({
        label: `round${round}-incumbent-gate${suffix}`,
        variant: { ...incumbentVariant, tier },
        lane: 'incumbent',
        examples: gateExamples,
        rollouts: Math.max(rollouts, 2),
        esClient,
        target: incumbentTarget,
        connectorId: tier,
        log,
        concurrency,
        goldRows: gateGold,
        outputDir,
      });

      const candidateGate = await runVariant({
        label: `round${round}-candidate-gate${suffix}`,
        variant: { ...candidateVariant, tier },
        lane: 'candidate',
        examples: gateExamples,
        rollouts: Math.max(rollouts, 2),
        esClient,
        target: candidateTarget,
        connectorId: tier,
        log,
        concurrency,
        goldRows: gateGold,
        outputDir,
      });

      tierResults.push({
        tier: tier ?? 'default',
        gate: gateCandidate({ incumbent: incumbentGate, candidate: candidateGate }),
      });
      lastIncumbentGate = incumbentGate;
      lastCandidateGate = candidateGate;
    }

    const gateResult: GateResult = {
      ...tierResults[0].gate,
      accepted: tierResults.every(({ gate }) => gate.accepted),
      reasons: tierResults.flatMap(({ tier, gate }) =>
        gate.accepted ? [] : gate.reasons.map((reason) => `[${tier.slice(0, 8)}] ${reason}`)
      ),
    };

    const incumbentRuns = lastIncumbentGate!.runs;
    const candidateRuns = lastCandidateGate!.runs;
    const seedDeltas = [...new Set(incumbentRuns.map((entry) => entry.exampleId))].map(
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

    const verification = verifyManifest({ manifest: proposal.manifest, seedDeltas });
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
      manifest: proposal.manifest,
      verification,
      filesChanged: codeEdits.map((edit) => edit.path),
      diff: diff.slice(0, 40_000),
      parentHash: incumbentVariant.hash,
      variantHash: candidateVariant.hash,
      gate: gateResult,
      tiers: tierResults,
      searchReward: searchRun.meanReward,
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
      await waitForKibana({ url: incumbentTarget.kibanaUrl, log });
      log.info(`[harness-opt] round ${round} promoted to incumbent`);
    } else {
      await resetCandidate(workspace);
    }
  }

  log.info(`[harness-opt] ledger: ${ledgerPath}`);
};
