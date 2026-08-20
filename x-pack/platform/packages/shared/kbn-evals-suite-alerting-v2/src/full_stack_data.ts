/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { cleanup, generate, type PartialConfig } from '@kbn/data-forge';
import type { ToolingLog } from '@kbn/tooling-log';

export const ADMIN_CONSOLE_INDEX = 'kbn-data-forge-fake_stack.admin-console-*';

export const HOST_METRICS_INDEX = 'kbn-data-forge-fake_hosts.fake_hosts-*';

export const HOST_METRICS_CPU_FIELD = 'system.cpu.total.norm.pct';

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
