/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import { Client } from '@elastic/elasticsearch';
import { run } from '@kbn/dev-cli-runner';
import { getConnectionConfig } from './seed_ki_sample_data/lib/connection_config';
import type { DatasetName, EvalConfig, LongMemEvalVariant } from './dreaming_eval/config';
import {
  DATASET_NAMES,
  LONGMEMEVAL_VARIANTS,
  DEFAULT_CONFIG_PATH,
  loadConfig,
  runDirOf,
  selectAiIndexIds,
  withSampleOverrides,
} from './dreaming_eval/config';
import type { StageContext } from './dreaming_eval/context';
import { createKibanaCall } from './dreaming_eval/context';
import { runAsk } from './dreaming_eval/stages/ask';
import { runCleanup } from './dreaming_eval/stages/cleanup';
import { runConfigure } from './dreaming_eval/stages/configure';
import { runEvaluate } from './dreaming_eval/stages/evaluate';
import { runExtract } from './dreaming_eval/stages/extract';
import { runImport } from './dreaming_eval/stages/import';
import { runIdOfShared, runLoad } from './dreaming_eval/stages/load';
import { hasKiDump, runRun } from './dreaming_eval/stages/run';

const STAGES = {
  extract: runExtract,
  import: runImport,
  configure: runConfigure,
  run: runRun,
  load: runLoad,
  evaluate: runEvaluate,
  ask: runAsk,
  cleanup: runCleanup,
} as const;

type Stage = keyof typeof STAGES;
const STAGE_NAMES = Object.keys(STAGES) as Stage[];
/** Stages that run only when named, or turned on in the config. */
const OPTIONAL_STAGES: Stage[] = ['load', 'ask', 'cleanup'];

const parseStages = (value: unknown, optional: Stage[]): Stage[] => {
  if (value === undefined || value === '' || value === true) {
    return STAGE_NAMES.filter(
      (stage) => !OPTIONAL_STAGES.includes(stage) || optional.includes(stage)
    );
  }
  const requested = String(value)
    .split(',')
    .map((stage) => stage.trim())
    .filter(Boolean);
  const unknown = requested.filter((stage) => !(STAGE_NAMES as string[]).includes(stage));
  if (unknown.length > 0) {
    throw new Error(`Unknown stage ${unknown.join(', ')}; stages: ${STAGE_NAMES.join(', ')}`);
  }
  return STAGE_NAMES.filter((stage) => requested.includes(stage));
};

const listFlag = (value: unknown): string[] | undefined =>
  typeof value === 'string' && value.trim()
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : undefined;

const newRunId = (): string => new Date().toISOString().replace(/[:.]/g, '-').replace(/Z$/, '');

/** The most recent run that dumped KIs for every selected AI index. */
const latestRunId = (config: EvalConfig, aiIndexIds: string[]): string | undefined => {
  const runsDir = path.join(config.dataDir, 'runs');
  if (!fs.existsSync(runsDir)) {
    return undefined;
  }
  return fs
    .readdirSync(runsDir)
    .sort()
    .reverse()
    .find((runId) => aiIndexIds.every((id) => hasKiDump(runDirOf(config, runId, id))));
};

run(
  async ({ log, flags }) => {
    const configPath = path.resolve(process.cwd(), String(flags.config || DEFAULT_CONFIG_PATH));
    const loaded = loadConfig(configPath, process.cwd());
    const stages = parseStages(flags.stage, loaded.ask.enabled ? ['ask'] : []);

    const datasets = listFlag(flags.dataset);
    const unknownDatasets = (datasets ?? []).filter(
      (dataset) => !(DATASET_NAMES as readonly string[]).includes(dataset)
    );
    if (unknownDatasets.length > 0) {
      throw new Error(
        `Unknown dataset ${unknownDatasets.join(', ')}; datasets: ${DATASET_NAMES.join(', ')}`
      );
    }
    const aiIndexIds = selectAiIndexIds(loaded, {
      aiIndexIds: listFlag(flags['ai-index']),
      datasets: datasets as DatasetName[] | undefined,
    });
    const usedDatasets = [
      ...new Set(
        loaded.ai_indices
          .filter(({ id }) => aiIndexIds.includes(id))
          .flatMap((aiIndex) => aiIndex.datasets)
      ),
    ];
    const sampleCount = flags['sample-count'] ? Number(flags['sample-count']) : undefined;
    if (sampleCount !== undefined && (!Number.isInteger(sampleCount) || sampleCount < 1)) {
      throw new Error('--sample-count must be a positive integer');
    }
    const variant = flags.variant ? String(flags.variant) : undefined;
    if (variant && !LONGMEMEVAL_VARIANTS.includes(variant as LongMemEvalVariant)) {
      throw new Error(`--variant must be one of ${LONGMEMEVAL_VARIANTS.join(', ')}`);
    }
    const withVariant: EvalConfig = variant
      ? {
          ...loaded,
          datasets: {
            ...loaded.datasets,
            longmemeval_s: {
              ...loaded.datasets.longmemeval_s,
              variant: variant as LongMemEvalVariant,
            },
          },
        }
      : loaded;
    const config = withSampleOverrides(withVariant, usedDatasets, {
      samples: listFlag(flags.samples),
      preset: flags.preset ? String(flags.preset) : undefined,
      sampleCount,
      allSamples: flags['all-samples'] === true,
      perSample: flags['per-sample'] === true,
    });

    const loadFrom = flags.from ? path.resolve(process.cwd(), String(flags.from)) : undefined;
    if (stages.includes('load') && !loadFrom) {
      throw new Error(
        'The load stage needs --from: a run folder, an AI index folder or a kis.json'
      );
    }
    const runId = flags['run-id']
      ? String(flags['run-id'])
      : stages.includes('run')
      ? newRunId()
      : stages.includes('load') && loadFrom
      ? runIdOfShared(loadFrom)
      : latestRunId(config, aiIndexIds);
    if (!runId && stages.includes('evaluate')) {
      throw new Error('No run to evaluate: run the run stage first, or pass --run-id');
    }

    const connection = await getConnectionConfig(flags, log);
    const context: StageContext = {
      config,
      log,
      esClient: new Client({
        node: connection.esUrl,
        auth: { username: connection.username, password: connection.password },
        requestTimeout: 120_000,
      }),
      kibana: createKibanaCall(connection, config.space),
      runId: runId ?? newRunId(),
      aiIndexIds,
      forceDownload: flags['force-download'] === true,
      judgeConnectorId: flags['judge-connector'] ? String(flags['judge-connector']) : undefined,
      loadFrom,
    };

    log.info(
      `Stages ${stages.join(', ')} for ${aiIndexIds.join(', ')} on ${usedDatasets.join(
        ', '
      )} (config ${path.relative(process.cwd(), configPath)}${
        ['run', 'load', 'evaluate', 'ask'].some((stage) => stages.includes(stage as Stage))
          ? `, run ${context.runId}`
          : ''
      })`
    );
    for (const stage of stages) {
      log.info(`── ${stage}`);
      await STAGES[stage](context);
    }
  },
  {
    description: `
      Evaluates Context Engine dreaming on agent conversations. Extracts LongMemEval chats and
      LongMemEval-V2 web agent trajectories (ServiceNow, and WebArena sites), imports them as
      Agent Builder OTel traces, configures AI indices that dream on them, runs their workflows
      from a clean slate, dumps the KIs they write, and judges them against target knowledge.

      Stages, in order: ${STAGE_NAMES.join(', ')}. Without --stage, all of them run but load,
      ask and cleanup. Load writes KIs someone else dreamed (--from) to the AI index, to try
      retrieval on them without dreaming. Ask puts the targets' questions to an agent that has
      only the AI index, and judges its answers; it also runs when ask.enabled is set in the
      config. Cleanup deletes the imported traces, the AI indices with their KIs and workflows,
      and the answer agents with their conversations; it keeps the files, runs included.

      A sample is a benchmark question with the conversations it is asked over. By default one
      LongMemEval S sample runs; the config picks the datasets and samples, and the flags below
      override it.
    `,
    flags: {
      string: [
        'stage',
        'config',
        'dataset',
        'ai-index',
        'samples',
        'preset',
        'sample-count',
        'variant',
        'run-id',
        'judge-connector',
        'from',
        'es-url',
        'es-username',
        'es-password',
        'kibana-url',
      ],
      boolean: ['force-download', 'all-samples', 'per-sample'],
      help: `
        --stage <names>         Comma-separated stages to run: ${STAGE_NAMES.join(
          ', '
        )} (default: all but load, ask and cleanup)
        --config <file>         Eval config (default: ${path.relative(
          process.cwd(),
          DEFAULT_CONFIG_PATH
        )})
        --dataset <names>       Comma-separated datasets to evaluate: ${DATASET_NAMES.join(
          ', '
        )}; the stages work on the AI indices that dream on only these (default: run_datasets)
        --ai-index <ids>        Comma-separated AI indices of the config instead (default: by dataset)
        --samples <ids>         Samples (question ids) to evaluate, of the one dataset in use
        --variant <s|m|oracle>  LongMemEval haystack size: s (about 50 sessions a question), m (about
                                500), or oracle (only the answer sessions); default: from the config
        --preset <name>         Evaluate the samples of a preset of the one dataset in use, such as dev
        --sample-count <n>      Evaluate the first n samples
        --all-samples           Evaluate every sample
        --per-sample            Run the samples one at a time, each with only its own conversations
                                (the default for longmemeval_s), dumping each sample's KIs
        --run-id <id>           Run to write (run stage) or read (evaluate stage); default: a new
                                run for the run stage, else the latest one
        --judge-connector <id>  AI connector that judges the KIs (default: evaluate.connector_id,
                                then Kibana's default AI connector)
        --from <path>           What the load stage loads: a run folder someone shared
                                (data/context_engine_dreaming_eval/runs/<run id>), one AI index's
                                folder of it, or a kis.json
        --force-download        Download the datasets again
        --es-url <url>          Elasticsearch URL (default: http://localhost:9200)
        --es-username <user>    Username for Elasticsearch and Kibana (default: elastic)
        --es-password <pass>    Password (default: changeme)
        --kibana-url <url>      Kibana base URL (default: from kibana.dev.yml)
      `,
    },
  }
);
