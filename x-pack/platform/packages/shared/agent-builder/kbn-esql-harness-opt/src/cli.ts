/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { run } from '@kbn/dev-cli-runner';
import { DEFAULT_ESQL_HARNESS_CONFIG } from '@kbn/agent-builder-genai-utils/tools/generate_esql/harness_config';
import {
  allExamples,
  anchorExamples,
  examplesForSplit,
  generatedExamples,
  GENERATED_CORPUS_PATH,
} from './dataset';
import type { Split } from './dataset';
import { createEsClient, executeGenerateEsql, resolveTarget } from './clients';
import { setupFixtures } from './corpora/setup';
import { buildGoldRowCache, runConfig } from './runner';
import { executeGold, scoreQuery } from './scorers';
import type { RunSummary } from './runner';
import { gateCandidate } from './gate';
import { lintProposal, proposeCandidate } from './proposer';
import { verificationSummary, verifyManifest } from './verification';
import { harnessPaths, writeActiveConfig } from './workspace';
import { serveReport, writeReport } from './report';
import { readModelChoices, setupModelConnectors } from './models';
import {
  backTranslate,
  balanceCorpus,
  labelDifficulty,
  synthesizeQueries,
  writeCorpus,
  writeLabelled,
} from './corpus/generate';
import type { GeneratedExample } from './corpus/generate';
import { corpusIndices, installSampleData } from './corpora/setup';

type HarnessConfigObject = Record<string, unknown>;

/** `@kbn/dev-cli-runner` hands back `''` for declared-but-unpassed string flags. */
const optionalFlag = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const defaultConfig = (): HarnessConfigObject =>
  JSON.parse(JSON.stringify(DEFAULT_ESQL_HARNESS_CONFIG)) as HarnessConfigObject;

const loadConfig = (path?: string): HarnessConfigObject =>
  path ? (JSON.parse(Fs.readFileSync(path, 'utf8')) as HarnessConfigObject) : defaultConfig();

const withMaxRetries = (config: HarnessConfigObject, maxRetries: number): HarnessConfigObject => ({
  ...config,
  retryPolicy: { ...(config.retryPolicy as object), maxRetries },
});

export const cli = () =>
  run(
    async ({ log, flags }) => {
      const command = String(flags._[0] ?? 'help');
      const concurrency = Number(optionalFlag(flags.concurrency) ?? 4);
      const target = resolveTarget({
        kibanaUrl: optionalFlag(flags['kibana-url']),
        esUrl: optionalFlag(flags['es-url']),
      });
      const esClient = createEsClient(target);
      const { runsDir, lineageDir, configPath, tracePath } = harnessPaths();

      if (command === 'help') {
        log.info(`Commands:
  setup-fixtures [--sample-data]    create and seed the fixture indices (and sample data sets)
  generate-corpus [--probes n]      synthesize, back-translate and difficulty-label a corpus
  baseline [--rollouts n]           run the default config plus matched-compute variants
  round [--config path]             one propose → gate round against the current incumbent
  campaign --rounds n               repeat rounds, promoting accepted candidates
  sealed --config path              score a config on the sealed split
  report [--serve] [--port n]       write (or serve) an HTML report of all rounds and runs
  setup-models                      create the inference connectors the model slot can choose

Start Kibana with:
  ESQL_HARNESS_CONFIG=${configPath} ESQL_HARNESS_TRACE_FILE=${tracePath}`);
        return;
      }

      if (command === 'report') {
        if (flags.serve) {
          await serveReport({
            host: optionalFlag(flags.host) ?? '0.0.0.0',
            port: Number(optionalFlag(flags.port) ?? 7711),
            log,
          });
          return;
        }
        log.info(`[harness-opt] report written to ${writeReport()}`);
        return;
      }

      if (command === 'setup-models') {
        await setupModelConnectors({ target, log });
        return;
      }

      if (command === 'generate-corpus') {
        const probes = Number(optionalFlag(flags.probes) ?? 2);
        const backTranslateCommand =
          process.env.HARNESS_BACKTRANSLATE_CMD ?? 'claude -p --permission-mode plan';
        const [cmd, ...cmdArgs] = backTranslateCommand.split(' ');

        const queries = await synthesizeQueries({ esClient, indices: corpusIndices, log });
        log.info(`[corpus] ${queries.length} executed candidate queries`);

        const raw = await backTranslate({ queries, command: cmd, commandArgs: cmdArgs, log });
        log.info(`[corpus] ${raw.length} back-translated questions`);

        // Difficulty probe: run each question through the current harness and compare rows to
        // gold. Cheap, and it is what keeps the corpus off both ceilings.
        const goldCache = new Map<string, string[] | null>();
        for (const example of raw) {
          if (!goldCache.has(example.goldQuery)) {
            goldCache.set(example.goldQuery, (await executeGold(esClient, example.goldQuery)).rows);
          }
        }

        const probeExample = async (example: GeneratedExample): Promise<GeneratedExample> => {
          const gold = goldCache.get(example.goldQuery) ?? null;
          let solved = 0;
          for (let attempt = 0; attempt < probes; attempt++) {
            const result = await executeGenerateEsql({
              target,
              question: example.question,
              index: example.index,
            });
            const score = await scoreQuery({ esClient, query: result.esql, goldRows: gold });
            // 0.9 rather than exact: a back-translated question can leave one tie-break or one
            // extra projected column open without being a different question.
            if ((score.resultEquivalence ?? 0) >= 0.9) solved++;
          }
          return labelDifficulty({ example, solvedBy: solved, attempts: probes });
        };

        const labelled: GeneratedExample[] = [];
        let cursor = 0;
        await Promise.all(
          Array.from({ length: concurrency }, async () => {
            while (cursor < raw.length) {
              const example = raw[cursor++];
              labelled.push(await probeExample(example));
              if (labelled.length % 20 === 0) {
                log.info(`[corpus] probed ${labelled.length}/${raw.length}`);
              }
            }
          })
        );

        writeLabelled(GENERATED_CORPUS_PATH.replace('.json', '.labelled.json'), labelled);
        const rawCounts = labelled.reduce<Record<string, number>>((acc, example) => {
          const key = example.difficulty ?? 'unknown';
          acc[key] = (acc[key] ?? 0) + 1;
          return acc;
        }, {});
        log.info(`[corpus] labelled ${labelled.length}: ${JSON.stringify(rawCounts)}`);

        const balanced = balanceCorpus({ examples: labelled });
        writeCorpus(GENERATED_CORPUS_PATH, balanced);
        const counts = balanced.reduce<Record<string, number>>((acc, example) => {
          const key = example.difficulty ?? 'unknown';
          acc[key] = (acc[key] ?? 0) + 1;
          return acc;
        }, {});
        log.info(
          `[corpus] wrote ${balanced.length} examples to ${GENERATED_CORPUS_PATH}: ${JSON.stringify(
            counts
          )}`
        );
        return;
      }

      if (command === 'setup-fixtures') {
        if (flags['sample-data']) {
          await installSampleData({ ...target, log });
        }
        await setupFixtures({ esClient, log });
        const gold = await buildGoldRowCache({ esClient, examples: anchorExamples });
        const executable = [...gold.values()].filter((rows) => rows !== null).length;
        log.info(
          `[harness-opt] ${executable}/${anchorExamples.length} anchor gold queries execute against the fixtures`
        );
        log.info(
          `[harness-opt] ${generatedExamples().length} generated examples, ${
            allExamples().length
          } total`
        );
        for (const split of ['search', 'gate', 'sealed'] as Split[]) {
          log.info(`[harness-opt] ${split}: ${examplesForSplit(split).length} examples`);
        }
        return;
      }

      const rollouts = Number(optionalFlag(flags.rollouts) ?? 1);
      const splitFlag = optionalFlag(flags.split) as Split | undefined;

      if (command === 'baseline') {
        const examples = examplesForSplit(splitFlag ?? 'search');
        const goldRows = await buildGoldRowCache({ esClient, examples });
        const outputDir = Path.join(runsDir, `baseline-${Date.now()}`);

        const variants: Array<{ label: string; config: HarnessConfigObject }> = [
          { label: 'default', config: defaultConfig() },
          { label: 'maxRetries-1', config: withMaxRetries(defaultConfig(), 1) },
          { label: 'maxRetries-5', config: withMaxRetries(defaultConfig(), 5) },
        ];

        for (const variant of variants) {
          await runConfig({
            ...variant,
            examples,
            rollouts,
            esClient,
            target,
            log,
            concurrency,
            goldRows,
            outputDir,
          });
        }
        log.info(`[harness-opt] baseline written to ${outputDir}`);
        return;
      }

      if (command === 'sealed') {
        const examples = examplesForSplit('sealed');
        const goldRows = await buildGoldRowCache({ esClient, examples });
        const config = loadConfig(optionalFlag(flags.config));
        await runConfig({
          label: 'sealed',
          config,
          examples,
          rollouts,
          esClient,
          target,
          log,
          concurrency,
          goldRows,
          outputDir: Path.join(runsDir, `sealed-${Date.now()}`),
        });
        return;
      }

      if (command === 'round' || command === 'campaign') {
        const roundCount = command === 'campaign' ? Number(optionalFlag(flags.rounds) ?? 3) : 1;
        const searchExamples = examplesForSplit('search');
        const gateExamples = examplesForSplit('gate');
        const searchGold = await buildGoldRowCache({ esClient, examples: searchExamples });
        const gateGold = await buildGoldRowCache({ esClient, examples: gateExamples });

        Fs.mkdirSync(lineageDir, { recursive: true });
        const ledgerPath = Path.join(lineageDir, 'ledger.json');
        const ledger: unknown[] = Fs.existsSync(ledgerPath)
          ? (JSON.parse(Fs.readFileSync(ledgerPath, 'utf8')) as unknown[])
          : [];

        let incumbent = loadConfig(optionalFlag(flags.config));
        let incumbentGateRun: RunSummary | undefined;
        let lastFeedback = '';

        for (let round = 0; round < roundCount; round++) {
          const outputDir = Path.join(runsDir, `round-${Date.now()}`);

          const searchRun = await runConfig({
            label: `round${round}-incumbent-search`,
            config: incumbent,
            examples: searchExamples,
            rollouts,
            esClient,
            target,
            log,
            concurrency,
            goldRows: searchGold,
            outputDir,
          });

          const measuredFacts = [
            '# Measured facts about this harness',
            '',
            `- Over ${
              searchRun.runs.length
            } runs on the search split the harness needed ${searchRun.meanTries.toFixed(
              2
            )} generation attempts on average and ${(searchRun.meanExecutes * 100).toFixed(
              0
            )}% of queries executed. Almost nothing fails with an Elasticsearch error.`,
            '- A matched-compute baseline measured `maxRetries` 1, 3 and 5 as indistinguishable.',
            '  Retry policy (slot E) and error feedback (slot D) therefore have almost no surface',
            '  on this dataset: the failures are semantic (wrong rows), not syntactic.',
            `- Mean result equivalence is ${searchRun.meanResultEquivalence.toFixed(
              3
            )} while execution is near-perfect, so the gap is entirely in producing the right rows.`,
            '- Cost is priced in USD per model, so switching the model slot changes cost even when',
            '  token counts stay the same.',
            '',
            lastFeedback ? `# Your last proposal\n\n${lastFeedback}` : '',
          ].join('\n');

          let proposal;
          try {
            proposal = await proposeCandidate({
              summary: searchRun,
              incumbentConfig: incumbent,
              history: ledger,
              feedback: measuredFacts,
              scratchDir: Path.join(outputDir, 'proposer'),
              log,
              modelChoices: readModelChoices(),
            });
          } catch (e) {
            // A proposer that times out or answers in the wrong shape costs the round, not the
            // campaign — the ledger records it so a systematically broken proposer is visible.
            log.warning(`[harness-opt] round ${round} proposer failed: ${(e as Error).message}`);
            ledger.push({ round, rejected: 'proposer-failed', error: (e as Error).message });
            Fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
            continue;
          }

          const violations = lintProposal(proposal.config);
          if (violations.length > 0) {
            log.warning(`[harness-opt] proposal rejected by lint: ${violations.join('; ')}`);
            ledger.push({ round, rejected: 'lint', violations, manifest: proposal.manifest });
            Fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
            continue;
          }

          // Harness fixes are pathology-matched to a model, so a candidate has to clear the gate
          // on every tier it is evaluated on, not just the one it was diagnosed from.
          const tiers = (optionalFlag(flags.tiers) ?? '')
            .split(',')
            .map((tier) => tier.trim())
            .filter(Boolean);
          const tierConfigs: Array<{
            name: string;
            apply: (config: HarnessConfigObject) => HarnessConfigObject;
          }> = tiers.length
            ? tiers.map((connectorId) => ({
                name: connectorId,
                apply: (config) => ({
                  ...config,
                  model: { ...(config.model as object), generateConnectorId: connectorId },
                }),
              }))
            : [{ name: 'default-tier', apply: (config) => config }];

          const tierResults: Array<{ tier: string; gate: ReturnType<typeof gateCandidate> }> = [];
          let lastIncumbentGate: RunSummary | undefined;
          let lastCandidateGate: RunSummary | undefined;

          for (const tier of tierConfigs) {
            const incumbentTierRun = await runConfig({
              label: `round${round}-incumbent-gate${
                tiers.length ? `-${tier.name.slice(0, 8)}` : ''
              }`,
              config: tier.apply(incumbent),
              examples: gateExamples,
              rollouts: Math.max(rollouts, 2),
              esClient,
              target,
              log,
              concurrency,
              goldRows: gateGold,
              outputDir,
            });

            const candidateTierRun = await runConfig({
              label: `round${round}-candidate-gate${
                tiers.length ? `-${tier.name.slice(0, 8)}` : ''
              }`,
              config: tier.apply(proposal.config),
              examples: gateExamples,
              rollouts: Math.max(rollouts, 2),
              esClient,
              target,
              log,
              concurrency,
              goldRows: gateGold,
              outputDir,
            });

            tierResults.push({
              tier: tier.name,
              gate: gateCandidate({ incumbent: incumbentTierRun, candidate: candidateTierRun }),
            });
            lastIncumbentGate = incumbentTierRun;
            lastCandidateGate = candidateTierRun;
          }

          incumbentGateRun = lastIncumbentGate!;
          const candidateGateRun = lastCandidateGate!;
          const gateResult = {
            ...tierResults[0].gate,
            accepted: tierResults.every(({ gate }) => gate.accepted),
            reasons: tierResults.flatMap(({ tier, gate }) =>
              gate.accepted ? [] : gate.reasons.map((reason) => `[${tier}] ${reason}`)
            ),
          };

          const incumbentRuns = incumbentGateRun.runs;
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
              const candidateReward = rewardFor(candidateGateRun.runs);
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
          lastFeedback = [
            verificationSummary(verification),
            `The edit itself was ${gateResult.accepted ? 'accepted' : 'rejected'}${
              gateResult.accepted ? '' : ` because: ${gateResult.reasons.join('; ')}`
            }.`,
          ].join(' ');

          ledger.push({
            round,
            manifest: proposal.manifest,
            verification,
            incumbentConfig: incumbent,
            gate: gateResult,
            tiers: tierResults,
            searchReward: searchRun.meanReward,
            incumbentGateReward: incumbentGateRun.meanReward,
            candidateGateReward: candidateGateRun.meanReward,
            config: proposal.config,
          });
          Fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));

          if (gateResult.accepted) {
            incumbent = proposal.config;
            Fs.writeFileSync(
              Path.join(lineageDir, `accepted-${round}-${candidateGateRun.configHash}.json`),
              JSON.stringify(incumbent, null, 2)
            );
          }
        }

        writeActiveConfig(incumbent);
        log.info(`[harness-opt] ledger: ${ledgerPath}`);
        return;
      }

      throw new Error(`Unknown command "${command}"`);
    },
    {
      description: 'Automated optimization loop for the generate_esql harness',
      flags: {
        string: [
          'config',
          'kibana-url',
          'es-url',
          'split',
          'rollouts',
          'rounds',
          'concurrency',
          'probes',
          'port',
          'host',
          'tiers',
        ],
        boolean: ['serve', 'sample-data'],
        help: `
        --config <path>      incumbent config to start from (default: shipped defaults)
        --split <name>       search | gate | sealed (baseline only)
        --rollouts <n>       repetitions per example (default 1)
        --rounds <n>         rounds for the campaign command (default 3)
        --concurrency <n>    parallel tool calls (default 4)
        --tiers <ids>        comma-separated connector ids; candidate must pass the gate on each
        --kibana-url <url>   default http://localhost:5601
        --es-url <url>       default http://localhost:9200
        `,
      },
    }
  );
