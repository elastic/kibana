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
import { buildGoldRowCache, runConfig } from './runner';
import type { RunSummary } from './runner';
import { gateCandidate } from './gate';
import type { GateResult } from './gate';
import { lintProposal, proposeCandidate } from './proposer';
import { verificationSummary, verifyManifest } from './verification';
import { harnessPaths } from './workspace';
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
  tiers: string[];
  incumbentTarget: HarnessTarget;
  candidateTarget?: HarnessTarget;
  candidateWorktree?: string;
  mainWorktree: string;
  esClient: EsClient;
  searchExamples: HarnessExample[];
  gateExamples: HarnessExample[];
  startingConfig: Record<string, unknown>;
  log: ToolingLog;
}

/** Everything that defines one harness variant: policy, text assets and code. */
interface HarnessState {
  config: Record<string, unknown>;
  assets: Record<string, string>;
  codeEdits: CodeEdit[];
}

const tierApplications = (tiers: string[]) =>
  tiers.length
    ? tiers.map((connectorId) => ({
        name: connectorId,
        // A tier only fills in a model the candidate left unset: if the proposal pinned one, that
        // choice is part of what is being evaluated and must not be overwritten.
        apply: (config: Record<string, unknown>) => {
          const model = (config.model ?? {}) as { generateConnectorId?: string | null };
          return {
            ...config,
            model: { ...model, generateConnectorId: model.generateConnectorId ?? connectorId },
          };
        },
      }))
    : [{ name: 'default-tier', apply: (config: Record<string, unknown>) => config }];

const measuredFacts = (searchRun: RunSummary, lastFeedback: string): string =>
  [
    '# Measured facts about this harness',
    '',
    `- On the search split the harness needed ${searchRun.meanTries.toFixed(
      2
    )} generation attempts on average and ${(searchRun.meanExecutes * 100).toFixed(
      0
    )}% of queries executed without an Elasticsearch error.`,
    '- A matched-compute baseline measured `maxRetries` 1, 3 and 5 as indistinguishable, so retry',
    '  policy and error-feedback wording have little surface here: the failures are semantic',
    '  (wrong rows), not syntactic.',
    `- Mean result equivalence is ${searchRun.meanResultEquivalence.toFixed(
      3
    )} against near-perfect execution, so the whole gap is in producing the right rows.`,
    '- Cost is priced per model in USD, so a cheaper model can win on the cost path even at equal',
    '  quality, and an expensive model has to earn its price in reward.',
    '',
    lastFeedback ? `# How your last proposal turned out\n\n${lastFeedback}` : '',
  ].join('\n');

/**
 * One propose → validate → gate → promote cycle, repeated.
 *
 * The three edit channels (typed config, text assets, code files) are gated identically: a
 * candidate only becomes the incumbent by beating it on held-out examples, on every model tier,
 * without losing more than two seeds.
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
  startingConfig,
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

  const codeEditsEnabled = Boolean(candidateWorktree && candidateTarget);
  const workspace = codeEditsEnabled
    ? { path: candidateWorktree!, kibanaUrl: candidateTarget!.kibanaUrl }
    : undefined;

  let incumbent: HarnessState = { config: startingConfig, assets: {}, codeEdits: [] };
  let lastFeedback = '';

  for (let round = 0; round < rounds; round++) {
    const outputDir = Path.join(runsDir, `round-${Date.now()}`);

    const searchRun = await runConfig({
      label: `round${round}-incumbent-search`,
      config: incumbent.config,
      assets: incumbent.assets,
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

    if (workspace) {
      // Start the candidate from the incumbent's code, not from main: accepted edits accumulate.
      await resetCandidate(workspace);
      promoteEdits({ edits: incumbent.codeEdits, targetWorktree: workspace.path });
    }

    let proposal;
    try {
      proposal = await proposeCandidate({
        summary: searchRun,
        incumbentConfig: incumbent.config,
        incumbentAssets: incumbent.assets,
        history: ledger,
        feedback: measuredFacts(searchRun, lastFeedback),
        scratchDir: workspace
          ? Path.join(workspace.path, '.harness-scratch')
          : Path.join(outputDir, 'proposer'),
        workingDir: workspace?.path,
        editableFiles: codeEditsEnabled,
        modelChoices: readModelChoices(),
        log,
      });
    } catch (e) {
      log.warning(`[harness-opt] round ${round} proposer failed: ${(e as Error).message}`);
      ledger.push({ round, rejected: 'proposer-failed', error: (e as Error).message });
      saveLedger();
      continue;
    }

    const configViolations = lintProposal(proposal.config);
    if (configViolations.length > 0) {
      log.warning(
        `[harness-opt] config lint rejected the proposal: ${configViolations.join('; ')}`
      );
      ledger.push({
        round,
        rejected: 'lint',
        violations: configViolations,
        manifest: proposal.manifest,
      });
      saveLedger();
      if (workspace) await resetCandidate(workspace);
      continue;
    }

    let codeEdits: CodeEdit[] = [];
    let diff = '';
    if (workspace) {
      codeEdits = await collectEdits(workspace);
      if (codeEdits.length > 0) {
        const validation = await applyAndValidateEdits({ workspace, edits: codeEdits, log });
        if (!validation.ok) {
          log.warning(
            `[harness-opt] code edits rejected: ${validation.failures.join(' | ').slice(0, 600)}`
          );
          ledger.push({
            round,
            rejected: 'code-validation',
            failures: validation.failures.map((failure) => failure.slice(0, 800)),
            manifest: proposal.manifest,
          });
          saveLedger();
          await resetCandidate(workspace);
          continue;
        }
        diff = await candidateDiff(workspace);
        // The dev server reloads the edited files; measuring before it comes back would score
        // the previous code.
        await waitForKibana({ url: workspace.kibanaUrl, log });
      }
    }

    const candidateState: HarnessState = {
      config: proposal.config,
      assets: { ...incumbent.assets, ...(proposal.assets ?? {}) },
      codeEdits: codeEdits.length > 0 ? codeEdits : incumbent.codeEdits,
    };

    const tierResults: Array<{ tier: string; gate: GateResult }> = [];
    let lastIncumbentGate: RunSummary | undefined;
    let lastCandidateGate: RunSummary | undefined;

    for (const tier of tierApplications(tiers)) {
      const suffix = tiers.length ? `-${tier.name.slice(0, 8)}` : '';

      const incumbentGate = await runConfig({
        label: `round${round}-incumbent-gate${suffix}`,
        config: tier.apply(incumbent.config),
        assets: incumbent.assets,
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

      const candidateGate = await runConfig({
        label: `round${round}-candidate-gate${suffix}`,
        config: tier.apply(candidateState.config),
        assets: candidateState.assets,
        lane: codeEditsEnabled ? 'candidate' : 'incumbent',
        examples: gateExamples,
        rollouts: Math.max(rollouts, 2),
        esClient,
        target: codeEditsEnabled ? candidateTarget! : incumbentTarget,
        log,
        concurrency,
        goldRows: gateGold,
        outputDir,
      });

      tierResults.push({
        tier: tier.name,
        gate: gateCandidate({ incumbent: incumbentGate, candidate: candidateGate }),
      });
      lastIncumbentGate = incumbentGate;
      lastCandidateGate = candidateGate;
    }

    const gateResult: GateResult = {
      ...tierResults[0].gate,
      accepted: tierResults.every(({ gate }) => gate.accepted),
      reasons: tierResults.flatMap(({ tier, gate }) =>
        gate.accepted ? [] : gate.reasons.map((reason) => `[${tier}] ${reason}`)
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
        const incumbentReward = rewardFor(incumbentRuns);
        const candidateReward = rewardFor(candidateRuns);
        return {
          exampleId,
          question: example?.question ?? exampleId,
          provenance: example?.provenance ?? '',
          incumbent: incumbentReward,
          candidate: candidateReward,
          delta: candidateReward - incumbentReward,
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
      incumbentConfig: incumbent.config,
      config: proposal.config,
      assetsChanged: Object.keys(proposal.assets ?? {}),
      filesChanged: codeEdits.map((edit) => edit.path),
      diff: diff.slice(0, 20_000),
      gate: gateResult,
      tiers: tierResults,
      searchReward: searchRun.meanReward,
    });
    saveLedger();

    if (gateResult.accepted) {
      incumbent = candidateState;
      const lineageDirForRound = Path.join(lineageDir, `accepted-${round}`);
      Fs.mkdirSync(lineageDirForRound, { recursive: true });
      Fs.writeFileSync(
        Path.join(lineageDirForRound, 'config.json'),
        JSON.stringify(incumbent.config, null, 2)
      );
      Fs.writeFileSync(
        Path.join(lineageDirForRound, 'assets.json'),
        JSON.stringify(incumbent.assets, null, 2)
      );
      if (codeEdits.length > 0) {
        Fs.writeFileSync(Path.join(lineageDirForRound, 'code.diff'), diff);
        // Lock the code change in: the incumbent process has to run it from now on.
        promoteEdits({ edits: codeEdits, targetWorktree: mainWorktree });
        await waitForKibana({ url: incumbentTarget.kibanaUrl, log });
      }
      log.info(`[harness-opt] round ${round} promoted to incumbent`);
    } else if (workspace) {
      await resetCandidate(workspace);
    }
  }

  log.info(`[harness-opt] ledger: ${ledgerPath}`);
};
