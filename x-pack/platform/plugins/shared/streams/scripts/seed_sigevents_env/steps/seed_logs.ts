/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { sigEvents } from '@kbn/synthtrace';
import type { LogsManifest } from '@kbn/synthtrace/src/lib/service_graph_logs/types';
import { CLAIMS_APP } from '@kbn/synthtrace/src/scenarios/sigevents/mock_apps/claims';
import { incidentAt, makePhaseContext } from '@kbn/synthtrace/src/scenarios/sigevents/utils';
import type { SeedContext } from '../types';

const TICK_MS = 60_000;
const BULK_FLUSH_DOCS = 500;
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

  const operations: Array<Record<string, unknown>> = [];
  let pendingDocs = 0;
  let tickIndex = 0;

  const flushBulk = async () => {
    if (operations.length === 0) {
      return;
    }
    const res = await esClient.bulk({ operations: operations as never, refresh: false });
    if (res.errors) {
      const failed = res.items?.find(
        (item) =>
          (item as { index?: { error?: unknown } }).index?.error ||
          (item as { create?: { error?: unknown } }).create?.error
      );
      log.error(
        `Bulk indexing reported errors: ${JSON.stringify(failed ?? res.items?.slice(0, 3))}`
      );
      throw new Error('Elasticsearch bulk indexing failed while seeding logs');
    }
    operations.length = 0;
    pendingDocs = 0;
  };

  for (let ts = from; ts <= to; ts += TICK_MS) {
    const entries = generator(ts, tickIndex) as Array<{
      serialize(): Array<Record<string, unknown>>;
    }>;
    tickIndex += 1;

    for (const entry of entries) {
      // serialize() returns all documents the entry produces; iterate all, not just [0].
      for (const fields of entry.serialize() as Array<Record<string, unknown>>) {
        // Data streams require 'create' op type (not 'index').
        operations.push({ create: { _index: ctx.streamName } });
        operations.push(fields);
        pendingDocs += 1;

        if (pendingDocs >= BULK_FLUSH_DOCS) {
          await flushBulk();
        }
      }
    }
  }

  await flushBulk();
  log.info(
    `Seeded logs into "${ctx.streamName}" (ticks: ${tickIndex}, window: ${from} → ${to}, failure window: ${failureStartMs} → ${failureEndMs})`
  );

  return { failureStartMs, failureEndMs, manifest };
}
