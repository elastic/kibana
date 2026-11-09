/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { run } from '@kbn/dev-cli-runner';
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
import { buildGoldRowCache, runVariant } from './runner';
import { executeGold, scoreQuery } from './scorers';
import type { EsqlResult } from './scorers';
import { runCampaign } from './campaign';
import { restartLane, setupCandidateWorktree } from './candidate_workspace';
import { verifySealed } from './verify';
import { harnessPaths } from './workspace';
import { serveReport, writeReport } from './report';
import { setupModelConnectors } from './models';
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
import { loadEsTestData } from './corpora/es_test_data';
import {
  collectDetectionRuleCandidates,
  collectEsSpecCandidates,
  filterExecutable,
} from './corpus/expert';

/** `@kbn/dev-cli-runner` hands back `''` for declared-but-unpassed string flags. */
const optionalFlag = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

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
      const { runsDir } = harnessPaths();

      if (command === 'help') {
        log.info(`Commands:
  setup-fixtures [--sample-data]    create and seed the fixture indices (and sample data sets)
  setup-models                      create the inference connectors used as gate tiers
  setup-candidate                   create + bootstrap the candidate worktree (second lane)
  load-es-test-data [--es-repo p]   load Elasticsearch's ES|QL test dataset as a corpus index
  mine-expert [--limit n]           mine human-written queries (ES spec tests, detection rules)
  generate-corpus [--probes n]      synthesize, back-translate and difficulty-label a corpus
  baseline [--tiers ids]            measure this worktree's harness, per model tier
  round / campaign --rounds n       propose → validate → gate → promote, repeatedly
  check [--baseline ref]            held-out check: current harness vs baseline, repeated + paired
  sealed [--tiers id]               score the current worktree on the sealed split
  verify-tiers --tiers a,b          score the current worktree on each model, one lane restart each
  report [--serve] [--port n]       write (or serve) the HTML report

Both lanes' Kibana processes must run with ESQL_HARNESS_TRACE_FILE pointing at
<harness dir>/{incumbent,candidate}/trace.jsonl.`);
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

      if (command === 'load-es-test-data') {
        await loadEsTestData({
          esClient,
          esRepo: optionalFlag(flags['es-repo']) ?? `${process.env.HOME}/elasticsearch`,
          log,
        });
        return;
      }

      if (command === 'mine-expert') {
        const limit = Number(optionalFlag(flags.limit) ?? 40);
        // Each source gets its own budget: the spec tests are far more numerous and would
        // otherwise fill the list before a single detection rule is considered.
        const perSource = Math.max(limit * 2, 60);
        const candidates = [
          ...collectDetectionRuleCandidates({
            rulesRepo: optionalFlag(flags['rules-repo']) ?? '/tmp/dr',
            limit: perSource,
          }),
          ...collectEsSpecCandidates({
            esRepo: optionalFlag(flags['es-repo']) ?? `${process.env.HOME}/elasticsearch`,
            limit: perSource,
          }),
        ];
        log.info(`[expert] ${candidates.length} human-written candidate queries found`);

        const executable = await filterExecutable({ esClient, candidates, limit, log });
        const backTranslateCommand =
          process.env.HARNESS_BACKTRANSLATE_CMD ?? 'claude -p --permission-mode plan';
        const [cmd, ...cmdArgs] = backTranslateCommand.split(' ');

        const examples = await backTranslate({
          queries: executable.map((candidate) => ({
            index: candidate.index,
            family: candidate.source,
            query: candidate.query,
            rowCount: candidate.rowCount,
            intent: candidate.intent,
          })),
          command: cmd,
          commandArgs: cmdArgs,
          log,
        });

        const path = GENERATED_CORPUS_PATH.replace('generated_corpus', 'expert_corpus');
        writeCorpus(path, examples);
        log.info(`[expert] wrote ${examples.length} expert-authored examples to ${path}`);
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
        const goldCache = new Map<string, EsqlResult | null>();
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
        const tiers = (optionalFlag(flags.tiers) ?? '')
          .split(',')
          .map((tier) => tier.trim())
          .filter(Boolean);

        // The baseline is the harness as it stands in this worktree, measured on each model it
        // might run on — there is no config to vary any more.
        for (const tier of tiers.length ? tiers : [undefined]) {
          await runVariant({
            label: `baseline${tier ? `-${tier.slice(0, 8)}` : ''}`,
            variant: { hash: 'baseline', tier },
            lane: 'incumbent',
            examples,
            rollouts,
            esClient,
            target,
            connectorId: tier,
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
        const tier = optionalFlag(flags.tiers);
        await runVariant({
          label: 'sealed',
          variant: { hash: optionalFlag(flags.label) ?? 'sealed', tier },
          lane: optionalFlag(flags['candidate-url']) ? 'candidate' : 'incumbent',
          examples,
          rollouts,
          esClient,
          target: optionalFlag(flags['candidate-url'])
            ? { ...target, kibanaUrl: optionalFlag(flags['candidate-url'])! }
            : target,
          connectorId: tier,
          log,
          concurrency,
          goldRows,
          outputDir: Path.join(runsDir, `sealed-${Date.now()}`),
        });
        return;
      }

      if (command === 'check') {
        const snapshots = Fs.existsSync(Path.join(harnessPaths().lineageDir))
          ? Fs.readdirSync(harnessPaths().lineageDir)
              .map((entry) => Path.join(harnessPaths().lineageDir, entry, 'baseline-tool'))
              .filter((candidate) => Fs.existsSync(candidate))
              .sort()
          : [];

        await verifySealed({
          worktree: process.cwd(),
          baselineRef: optionalFlag(flags.baseline) ?? 'origin/main',
          baselineDir: optionalFlag(flags.baseline) ? undefined : snapshots[snapshots.length - 1],
          repeats: Number(optionalFlag(flags.repeats) ?? 2),
          rollouts,
          concurrency,
          examples: examplesForSplit((optionalFlag(flags.split) as Split) ?? 'sealed'),
          esClient,
          target,
          restartCommand:
            optionalFlag(flags['restart-incumbent']) ??
            process.env.HARNESS_RESTART_INCUMBENT ??
            'true',
          modelAlias: optionalFlag(flags.model),
          log,
        });
        return;
      }

      if (command === 'verify-tiers') {
        // Harness fixes are pathology-matched to a model, so before anything is promoted the
        // same variant is scored on each model it might run on. Pinning a model needs a lane
        // restart, which is why this is a separate step rather than part of every round.
        const examples = examplesForSplit((optionalFlag(flags.split) as Split) ?? 'sealed');
        const goldRows = await buildGoldRowCache({ esClient, examples });
        const outputDir = Path.join(runsDir, `verify-${Date.now()}`);
        const restart =
          optionalFlag(flags['restart-incumbent']) ??
          process.env.HARNESS_RESTART_INCUMBENT ??
          'true';

        for (const tier of (optionalFlag(flags.tiers) ?? '')
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)) {
          await restartLane({
            command: restart,
            url: target.kibanaUrl,
            env: { ESQL_HARNESS_MODEL_CONNECTOR: tier },
            log,
          });
          await runVariant({
            label: `verify-${tier.slice(0, 8)}`,
            variant: { hash: optionalFlag(flags.label) ?? 'incumbent', tier },
            lane: 'incumbent',
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
        log.info(`[harness-opt] tier verification written to ${outputDir}`);
        return;
      }

      if (command === 'setup-candidate') {
        await setupCandidateWorktree({
          mainWorktree: process.cwd(),
          candidatePath: optionalFlag(flags['candidate-path']) ?? `${process.cwd()}-candidate`,
          esUrl: target.esUrl,
          port: Number(optionalFlag(flags['candidate-port']) ?? 5691),
          log,
        });
        return;
      }

      if (command === 'round' || command === 'campaign') {
        const candidatePath = optionalFlag(flags['candidate-path']);
        const candidateUrl = optionalFlag(flags['candidate-url']);

        await runCampaign({
          rounds: command === 'campaign' ? Number(optionalFlag(flags.rounds) ?? 3) : 1,
          rollouts,
          concurrency,
          tier: optionalFlag(flags.tiers)?.split(',')[0]?.trim(),
          startingModel: optionalFlag(flags.model),
          incumbentTarget: target,
          candidateTarget: { ...target, kibanaUrl: candidateUrl ?? 'http://localhost:5691' },
          candidateWorktree: candidatePath ?? `${process.cwd()}-candidate`,
          mainWorktree: process.cwd(),
          restartCommands: {
            incumbent:
              optionalFlag(flags['restart-incumbent']) ??
              process.env.HARNESS_RESTART_INCUMBENT ??
              'true',
            candidate:
              optionalFlag(flags['restart-candidate']) ??
              process.env.HARNESS_RESTART_CANDIDATE ??
              'true',
          },
          esClient,
          searchExamples: examplesForSplit('search'),
          gateExamples: examplesForSplit('gate'),
          log,
        });
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
          'candidate-path',
          'candidate-url',
          'candidate-port',
          'label',
          'restart-incumbent',
          'restart-candidate',
          'baseline',
          'repeats',
          'model',
          'es-repo',
          'rules-repo',
          'limit',
        ],
        boolean: ['serve', 'sample-data'],
        help: `
        --split <name>       search | gate | sealed (baseline only)
        --rollouts <n>       repetitions per example (default 1)
        --rounds <n>         rounds for the campaign command (default 3)
        --concurrency <n>    parallel tool calls (default 4)
        --tiers <ids>        comma-separated connector ids; candidate must pass the gate on each
        --candidate-path <p> candidate worktree (enables whole-file edits)
        --candidate-url <u>  Kibana serving the candidate worktree, e.g. http://localhost:5691
        --baseline <ref>     git ref to compare against in check (default origin/main)
        --repeats <n>        measurements per side in check (default 2)
        --model <alias>      model the incumbent starts on (campaign) or is measured on (check)
        --kibana-url <url>   default http://localhost:5601
        --es-url <url>       default http://localhost:9200
        `,
      },
    }
  );
