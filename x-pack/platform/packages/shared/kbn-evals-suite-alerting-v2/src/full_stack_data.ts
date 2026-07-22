/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { cleanup, generate, type PartialConfig } from '@kbn/data-forge';
import type { ToolingLog } from '@kbn/tooling-log';

/**
 * Single entry point for seeding all eval data via `@kbn/data-forge`.
 *
 * NOTE: this intentionally runs data-forge twice. The `fake_stack` dataset
 * only generates log-style components (admin-console, mongodb, nginx-proxy,
 * message-processor, heartbeat) and carries no host CPU metrics, so the
 * `fake_hosts` dataset is still required for `system.cpu.total.norm.pct`
 * (see `@kbn/data-forge` `src/data_sources/fake_stack` vs `fake_hosts`).
 */

/**
 * The index `@kbn/data-forge` writes the `fake_stack` admin-console namespace to.
 * Documents include `log.level` (`INFO` / `ERROR`) among other ECS fields, so a
 * natural-language "errors on my admin console" prompt can resolve to a real,
 * mapped source after the agent discovers the index.
 */
export const ADMIN_CONSOLE_INDEX = 'kbn-data-forge-fake_stack.admin-console-*';

/**
 * The index `@kbn/data-forge` writes the `fake_hosts` dataset to. This is a
 * real, mapped index containing host CPU/memory metrics — notably
 * `system.cpu.total.norm.pct` (0–1) grouped by `host.name` — which lets the
 * rule-management skill's `set_query` operation validate its ES|QL against a
 * real source instead of failing on a non-existent index.
 */
export const HOST_METRICS_INDEX = 'kbn-data-forge-fake_hosts.fake_hosts-*';

/** The CPU metric field carried by the `fake_hosts` dataset. */
export const HOST_METRICS_CPU_FIELD = 'system.cpu.total.norm.pct';

/**
 * Programmatic data-forge config that seeds the `fake_stack` dataset (includes
 * the admin-console namespace with a mix of INFO and ERROR events). A short
 * recent window is enough for the index + mappings to exist so discovery and
 * `set_query` validation succeed.
 */
const FAKE_STACK_DATA_FORGE_CONFIG: PartialConfig = {
  schedule: [
    {
      template: 'good',
      start: 'now-15m',
      end: 'now',
    },
  ],
  indexing: { dataset: 'fake_stack' },
};

/**
 * Programmatic data-forge config that seeds the `fake_hosts` dataset with a
 * steady, high `system.cpu.total.norm.pct` (95%). A short recent window is
 * enough for the index + mappings to exist so `set_query` validation succeeds;
 * the high value also means a `> 90%` rule would genuinely fire if ever run.
 */
const FAKE_HOSTS_DATA_FORGE_CONFIG: PartialConfig = {
  schedule: [
    {
      template: 'good',
      start: 'now-15m',
      end: 'now',
      metrics: [{ name: HOST_METRICS_CPU_FIELD, method: 'linear', start: 0.95, end: 0.95 }],
    },
  ],
  indexing: { dataset: 'fake_hosts' },
};

const DATA_FORGE_CONFIGS: readonly PartialConfig[] = [
  FAKE_STACK_DATA_FORGE_CONFIG,
  FAKE_HOSTS_DATA_FORGE_CONFIG,
];

export const installFullStackDataForge = async (
  esClient: Client,
  log: ToolingLog
): Promise<string[]> => {
  const indices: string[] = [];
  for (const config of DATA_FORGE_CONFIGS) {
    indices.push(...(await generate({ client: esClient, config, logger: log })));
  }
  return indices;
};

export const removeFullStackDataForge = async (
  esClient: Client,
  log: ToolingLog
): Promise<void> => {
  for (const config of DATA_FORGE_CONFIGS) {
    await cleanup({ client: esClient, config, logger: log });
  }
};
