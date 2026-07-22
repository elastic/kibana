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
 * Programmatic data-forge config that seeds the `fake_hosts` dataset with a
 * steady, high `system.cpu.total.norm.pct` (95%). A short recent window is
 * enough for the index + mappings to exist so `set_query` validation succeeds;
 * the high value also means a `> 90%` rule would genuinely fire if ever run.
 */
export const HOST_METRICS_DATA_FORGE_CONFIG: PartialConfig = {
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

export const installHostMetricsDataForge = (esClient: Client, log: ToolingLog): Promise<string[]> =>
  generate({ client: esClient, config: HOST_METRICS_DATA_FORGE_CONFIG, logger: log });

export const removeHostMetricsDataForge = (esClient: Client, log: ToolingLog): Promise<void> =>
  cleanup({ client: esClient, config: HOST_METRICS_DATA_FORGE_CONFIG, logger: log });
