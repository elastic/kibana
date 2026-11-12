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
import type { EvalConfig } from './dreaming_eval/config';
import { DEFAULT_CONFIG_PATH, loadConfig, runDirOf } from './dreaming_eval/config';
import type { StageContext } from './dreaming_eval/context';
import { createKibanaCall } from './dreaming_eval/context';
import { runConfigure } from './dreaming_eval/stages/configure';
import { runEvaluate } from './dreaming_eval/stages/evaluate';
import { runExtract } from './dreaming_eval/stages/extract';
import { runImport } from './dreaming_eval/stages/import';
import { kiDumpFileOf, runRun } from './dreaming_eval/stages/run';

const STAGES = {
  extract: runExtract,
  import: runImport,
  configure: runConfigure,
  run: runRun,
  evaluate: runEvaluate,
} as const;

type Stage = keyof typeof STAGES;
const STAGE_NAMES = Object.keys(STAGES) as Stage[];

const parseStages = (value: unknown): Stage[] => {
  if (value === undefined || value === '' || value === true) {
    return STAGE_NAMES;
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
    .find((runId) =>
      aiIndexIds.every((id) => fs.existsSync(kiDumpFileOf(runDirOf(config, runId, id))))
    );
};

run(
  async ({ log, flags }) => {
    const stages = parseStages(flags.stage);
    const configPath = path.resolve(process.cwd(), String(flags.config || DEFAULT_CONFIG_PATH));
    const config = loadConfig(configPath, process.cwd());

    const allIds = config.ai_indices.map(({ id }) => id);
    const aiIndexIds = flags['ai-index']
      ? String(flags['ai-index'])
          .split(',')
          .map((id) => id.trim())
      : allIds;
    const unknownIds = aiIndexIds.filter((id) => !allIds.includes(id));
    if (unknownIds.length > 0) {
      throw new Error(`${configPath} has no AI index ${unknownIds.join(', ')}`);
    }

    const runId = flags['run-id']
      ? String(flags['run-id'])
      : stages.includes('run')
      ? newRunId()
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
    };

    log.info(
      `Stages ${stages.join(', ')} for ${aiIndexIds.join(', ')} (config ${path.relative(
        process.cwd(),
        configPath
      )}${stages.includes('run') || stages.includes('evaluate') ? `, run ${context.runId}` : ''})`
    );
    for (const stage of stages) {
      log.info(`── ${stage}`);
      await STAGES[stage](context);
    }
  },
  {
    description: `
      Evaluates Context Engine dreaming on agent conversations. Extracts LongMemEval S chats and
      LongMemEval-V2 enterprise (ServiceNow) trajectories, imports them as Agent Builder OTel
      traces, configures AI indices that dream on them, runs their workflows from a clean slate,
      dumps the KIs they write, and judges them against target knowledge.

      Stages, in order: ${STAGE_NAMES.join(', ')}. Without --stage, all of them run.
    `,
    flags: {
      string: [
        'stage',
        'config',
        'ai-index',
        'run-id',
        'judge-connector',
        'es-url',
        'es-username',
        'es-password',
        'kibana-url',
      ],
      boolean: ['force-download'],
      help: `
        --stage <names>         Comma-separated stages to run: ${STAGE_NAMES.join(
          ', '
        )} (default: all)
        --config <file>         Eval config (default: ${path.relative(
          process.cwd(),
          DEFAULT_CONFIG_PATH
        )})
        --ai-index <ids>        Comma-separated AI indices of the config to work on (default: all)
        --run-id <id>           Run to write (run stage) or read (evaluate stage); default: a new
                                run for the run stage, else the latest one
        --judge-connector <id>  AI connector that judges the KIs (default: evaluate.connector_id,
                                then Kibana's default AI connector)
        --force-download        Download the datasets again
        --es-url <url>          Elasticsearch URL (default: http://localhost:9200)
        --es-username <user>    Username for Elasticsearch and Kibana (default: elastic)
        --es-password <pass>    Password (default: changeme)
        --kibana-url <url>      Kibana base URL (default: from kibana.dev.yml)
      `,
    },
  }
);
