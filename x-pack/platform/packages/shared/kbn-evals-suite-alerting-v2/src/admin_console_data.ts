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
 * The index `@kbn/data-forge` writes the `fake_stack` admin-console namespace to.
 * Documents include `log.level` (`INFO` / `ERROR`) among other ECS fields, so a
 * natural-language "errors on my admin console" prompt can resolve to a real,
 * mapped source after the agent discovers the index.
 */
export const ADMIN_CONSOLE_INDEX = 'kbn-data-forge-fake_stack.admin-console-*';

/**
 * Programmatic data-forge config that seeds the `fake_stack` dataset (includes
 * the admin-console namespace with a mix of INFO and ERROR events). A short
 * recent window is enough for the index + mappings to exist so discovery and
 * `set_query` validation succeed.
 */
export const ADMIN_CONSOLE_DATA_FORGE_CONFIG: PartialConfig = {
  schedule: [
    {
      template: 'good',
      start: 'now-15m',
      end: 'now',
    },
  ],
  indexing: { dataset: 'fake_stack' },
};

export const installAdminConsoleDataForge = (
  esClient: Client,
  log: ToolingLog
): Promise<string[]> =>
  generate({ client: esClient, config: ADMIN_CONSOLE_DATA_FORGE_CONFIG, logger: log });

export const removeAdminConsoleDataForge = (esClient: Client, log: ToolingLog): Promise<void> =>
  cleanup({ client: esClient, config: ADMIN_CONSOLE_DATA_FORGE_CONFIG, logger: log });
