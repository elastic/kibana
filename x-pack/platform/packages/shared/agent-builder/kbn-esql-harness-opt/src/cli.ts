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
import { harnessPaths, writeActiveConfig } from './workspace';
import { writeReport } from './report';
import {
  backTranslate,
  balanceCorpus,
  labelDifficulty,
  synthesizeQueries,
  writeCorpus,
  writeLabelled,
} from './corpus/generate';
import type { GeneratedExample } from './corpus/generate';
import { corpusIndices } from './corpora/setup';

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
  setup-fixtures                    create and seed the fixture indices
  generate-corpus [--probes n]      synthesize, back-translate and difficulty-label a corpus
  baseline [--rollouts n]           run the default config plus matched-compute variants
  round [--config path]             one propose → gate round against the current incumbent
  campaign --rounds n               repeat rounds, promoting accepted candidates
  sealed --config path              score a config on the sealed split
  report                            write a self-contained HTML report of all rounds and runs

Start Kibana with:
  ESQL_HARNESS_CONFIG=${configPath} ESQL_HARNESS_TRACE_FILE=${tracePath}`);
        return;
      }

      if (command === 'report') {
        log.info(`[harness-opt] report written to ${writeReport()}`);
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

          let proposal;
          try {
            proposal = await proposeCandidate({
              summary: searchRun,
              incumbentConfig: incumbent,
              history: ledger,
              scratchDir: Path.join(outputDir, 'proposer'),
              log,
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

          incumbentGateRun = await runConfig({
            label: `round${round}-incumbent-gate`,
            config: incumbent,
            examples: gateExamples,
            rollouts: Math.max(rollouts, 2),
            esClient,
            target,
            log,
            concurrency,
            goldRows: gateGold,
            outputDir,
          });

          const candidateGateRun = await runConfig({
            label: `round${round}-candidate-gate`,
            config: proposal.config,
            examples: gateExamples,
            rollouts: Math.max(rollouts, 2),
            esClient,
            target,
            log,
            concurrency,
            goldRows: gateGold,
            outputDir,
          });

          const gateResult = gateCandidate({
            incumbent: incumbentGateRun,
            candidate: candidateGateRun,
          });

          log.info(
            `[harness-opt] round ${round}: Δreward ${gateResult.meanDelta.toFixed(
              3
            )} [${gateResult.ciLow.toFixed(3)}, ${gateResult.ciHigh.toFixed(
              3
            )}], tokens/solved ${gateResult.incumbentCostPerSolved.toFixed(
              0
            )} → ${gateResult.candidateCostPerSolved.toFixed(
              0
            )} [${gateResult.costPerSolvedCiLow.toFixed(
              0
            )}, ${gateResult.costPerSolvedCiHigh.toFixed(0)}], regressions ${
              gateResult.regressions.length
            }, cost ${gateResult.costRatio.toFixed(2)}× → ${
              gateResult.accepted
                ? `ACCEPTED via ${gateResult.acceptedVia}`
                : `rejected (${gateResult.reasons.join('; ')})`
            }`
          );

          ledger.push({
            round,
            manifest: proposal.manifest,
            gate: gateResult,
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
        ],
        help: `
        --config <path>      incumbent config to start from (default: shipped defaults)
        --split <name>       search | gate | sealed (baseline only)
        --rollouts <n>       repetitions per example (default 1)
        --rounds <n>         rounds for the campaign command (default 3)
        --concurrency <n>    parallel tool calls (default 4)
        --kibana-url <url>   default http://localhost:5601
        --es-url <url>       default http://localhost:9200
        `,
      },
    }
  );
