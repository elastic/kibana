/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseArgs } from 'node:util';
import type { SeedContext } from './seed_sigevents_env/types';

function printUsage(): void {
  process.stderr
    .write(`seed_sigevents_env — synthetic sigevents seed for local Kibana + Elasticsearch.

Usage:
  npx tsx x-pack/platform/plugins/shared/streams/scripts/seed_sigevents_env.ts [options]

Options:
  --scenario <name>        Scenario key in CLAIMS_SEED (default: postgres_timeout)
  --stream <name>          Target data stream (default: logs.ecs)
  --seed <n>               Synth RNG seed (default: 42)
  --baseline-minutes <n>   Baseline phase length in minutes (default: 30)
  --clean                  Delete previously seeded features, alerts, queries, insights; then seed
  --clean-logs             With cleanup: also delete the data stream (implies cleanup)
  --es-url <url>           Elasticsearch URL (overrides kibana.dev.yml)
  --es-username <user>
  --es-password <pass>
  --kibana-url <url>       Kibana base URL (overrides kibana.dev.yml)
  --help, -h               Show this message
`);
}

async function runSeeder(): Promise<void> {
  let values: {
    scenario?: string;
    stream?: string;
    seed?: string;
    'baseline-minutes'?: string;
    clean?: boolean;
    'clean-logs'?: boolean;
    'es-url'?: string;
    'es-username'?: string;
    'es-password'?: string;
    'kibana-url'?: string;
    help?: boolean;
  };

  try {
    const parsed = parseArgs({
      args: process.argv.slice(2),
      options: {
        scenario: { type: 'string', default: 'postgres_timeout' },
        stream: { type: 'string', default: 'logs.ecs' },
        seed: { type: 'string', default: '42' },
        'baseline-minutes': { type: 'string', default: '30' },
        clean: { type: 'boolean', default: false },
        'clean-logs': { type: 'boolean', default: false },
        'es-url': { type: 'string' },
        'es-username': { type: 'string' },
        'es-password': { type: 'string' },
        'kibana-url': { type: 'string' },
        help: { type: 'boolean', short: 'h', default: false },
      },
      allowPositionals: false,
      strict: true,
    });
    values = parsed.values;
  } catch {
    printUsage();
    process.exit(1);
  }

  if (values.help) {
    printUsage();
    process.exit(0);
  }

  const { Client } = await import('@elastic/elasticsearch');
  const { ToolingLog } = await import('@kbn/tooling-log');
  const { getConnectionConfig } = await import('./seed_sigevents_env/lib/get_connection_config');
  const { kibanaRequest } = await import('./seed_sigevents_env/lib/kibana');
  const { CLAIMS_SEED } = await import('./seed_sigevents_env/scenarios/claims');
  const { cleanSeedData } = await import('./seed_sigevents_env/steps/clean');
  const { seedAlerts } = await import('./seed_sigevents_env/steps/seed_alerts');
  const { seedFeatures } = await import('./seed_sigevents_env/steps/seed_features');
  const { seedInsights } = await import('./seed_sigevents_env/steps/seed_insights');
  const { seedLogs } = await import('./seed_sigevents_env/steps/seed_logs');
  const { seedQueries } = await import('./seed_sigevents_env/steps/seed_queries');
  const { seedTasks } = await import('./seed_sigevents_env/steps/seed_tasks');

  const log = new ToolingLog({ level: 'info', writeTo: process.stderr });

  const flags: Record<string, unknown> = {
    ...(values['es-url'] !== undefined ? { 'es-url': values['es-url'] } : {}),
    ...(values['es-username'] !== undefined ? { 'es-username': values['es-username'] } : {}),
    ...(values['es-password'] !== undefined ? { 'es-password': values['es-password'] } : {}),
    ...(values['kibana-url'] !== undefined ? { 'kibana-url': values['kibana-url'] } : {}),
  };

  const config = await getConnectionConfig(flags, log);

  const scenarioName = values.scenario ?? 'postgres_timeout';
  const streamName = values.stream ?? 'logs.ecs';
  const seed = Number.parseInt(values.seed ?? '42', 10);
  const baselineMinutes = Number.parseInt(values['baseline-minutes'] ?? '30', 10);

  if (!Number.isFinite(seed) || !Number.isFinite(baselineMinutes)) {
    throw new Error('--seed and --baseline-minutes must be valid numbers');
  }

  const scenario = CLAIMS_SEED[scenarioName];
  if (!scenario) {
    const available = Object.keys(CLAIMS_SEED).sort().join(', ');
    throw new Error(`Unknown scenario "${scenarioName}". Available: ${available}`);
  }

  const streamPath = `/api/streams/${encodeURIComponent(streamName)}`;
  const streamRes = await kibanaRequest(config, 'GET', streamPath);
  if (streamRes.status === 404) {
    process.stderr.write(
      `Error: stream "${streamName}" was not found (GET ${streamPath} → 404). ` +
        `Create or enable the stream first (e.g. POST /api/streams/_enable).\n`
    );
    process.exit(1);
  }
  if (streamRes.status >= 300) {
    throw new Error(
      `Unexpected response when checking stream (HTTP ${streamRes.status}): ${JSON.stringify(
        streamRes.data
      )}`
    );
  }

  const ctx: SeedContext = {
    esUrl: config.esUrl,
    kibanaUrl: config.kibanaUrl,
    username: config.username,
    password: config.password,
    streamName,
    scenarioName,
    seed,
    baselineMinutes,
    // Computed once and threaded to all steps that store generated_at, so the two storage
    // paths (Kibana API via seedInsights + .kibana_streams_tasks via seedTasks) stay in sync.
    generatedAt: new Date().toISOString(),
  };

  const esClient = new Client({
    node: config.esUrl,
    auth: {
      username: config.username,
      password: config.password,
    },
  });

  const shouldClean = values.clean === true || values['clean-logs'] === true;
  const cleanLogs = values['clean-logs'] === true;

  if (shouldClean) {
    log.info('Running clean step(s) before seeding…');
    await cleanSeedData(ctx, esClient, config, log, cleanLogs);
  }

  // Step ordering matters — dependencies:
  //   logs       → must exist before alerts (ESQL runs against seeded logs)
  //   queries    → must be promoted before rule_ids can be read (needed by alerts + tasks)
  //   features + queries + insights → all consumed by tasks (task payload embeds all three)

  log.info('Seeding logs…');
  const { failureStartMs, failureEndMs, manifest } = await seedLogs(ctx, esClient, log);

  log.info('Seeding features…');
  await seedFeatures(ctx, manifest, config, log);

  log.info('Seeding queries…');
  const seededQueries = await seedQueries(ctx, scenario, config, esClient, log);

  log.info('Seeding alerts…');
  await seedAlerts(ctx, seededQueries, failureStartMs, failureEndMs, esClient, log);

  log.info('Seeding insights…');
  await seedInsights(ctx, scenario, seededQueries, config, log);

  log.info('Seeding tasks…');
  await seedTasks(ctx, manifest, scenario, seededQueries, esClient, log);

  log.info('Done.');
}

runSeeder().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Error: ${msg}\n`);
  process.exit(1);
});
