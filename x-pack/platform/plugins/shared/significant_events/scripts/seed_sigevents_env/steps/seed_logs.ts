/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { LogLevel, SynthtraceClientsManager, createLogger, sigEvents } from '@kbn/synthtrace';
import type { LogsManifest } from '@kbn/synthtrace/src/lib/service_graph_logs/types';
import { CLAIMS_APP } from '@kbn/synthtrace/src/scenarios/sigevents/mock_apps/claims';
import { incidentAt, makePhaseContext } from '@kbn/synthtrace/src/scenarios/sigevents/utils';
import { timerange } from '@kbn/synthtrace-client';
import type { SeedContext } from '../types';

const TICK_MS = 60_000;
/** Baseline window before the failure injection phase, in minutes. */
const BASELINE_MINUTES = 30;

export async function seedLogs(
  ctx: SeedContext,
  esClient: Client,
  log: ToolingLog
): Promise<{ failureStartMs: number; failureEndMs: number; manifest: LogsManifest }> {
  const scenario = CLAIMS_APP.scenarios[ctx.scenarioName];
  if (!scenario) {
    throw new Error(
      `Unknown CLAIMS_APP scenario "${ctx.scenarioName}". Available: ${Object.keys(
        CLAIMS_APP.scenarios
      ).join(', ')}`
    );
  }

  const baselineMs = BASELINE_MINUTES * 60_000;
  const cycleDurationMs = (scenario.cycleDurationMinutes ?? 10) * 60_000;
  const to = Date.now();
  const from = to - baselineMs - cycleDurationMs;
  const failureStartMs = from + baselineMs;
  const failureEndMs = to;

  const {
    failures,
    volume,
    noise: scenarioNoise,
    ghostMentions,
  } = scenario.build(makePhaseContext(incidentAt(from, baselineMs)));

  const noise =
    scenarioNoise || ghostMentions
      ? { ...(scenarioNoise ?? {}), ...(ghostMentions ? { ghostMentions } : {}) }
      : undefined;

  const { generator, manifest } = sigEvents.buildLogsGenerator({
    seed: ctx.seed,
    serviceGraph: CLAIMS_APP.serviceGraph,
    entryService: CLAIMS_APP.entryService,
    tickIntervalMs: TICK_MS,
    cycleMs: cycleDurationMs,
    cycleOriginMs: failureStartMs,
    failures,
    volume,
    noise,
  });

  const manager = new SynthtraceClientsManager({
    client: esClient,
    logger: createLogger(LogLevel.info),
    refreshAfterIndex: false,
  });

  const { logsEsClient } = manager.getClients({ clients: ['logsEsClient'] });

  await logsEsClient.index(
    timerange(new Date(from), new Date(to)).interval('1m').generator(generator)
  );

  await esClient.indices.refresh({ index: `${ctx.streamName}*` });

  log.info(
    `Seeded logs into "${ctx.streamName}" (window: ${new Date(from).toISOString()} → ${new Date(
      to
    ).toISOString()}, failure: ${new Date(failureStartMs).toISOString()} → ${new Date(
      failureEndMs
    ).toISOString()})`
  );

  return { failureStartMs, failureEndMs, manifest };
}
