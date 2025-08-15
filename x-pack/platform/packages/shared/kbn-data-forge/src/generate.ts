/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { createConfig } from './lib/create_config';
import { run } from './run';
import type { PartialConfig } from './types';

export const generate = async ({
  client,
  config: partialConfig,
  logger,
}: {
  client: Client;
  config: PartialConfig;
  logger: ToolingLog;
}): Promise<string[]> => {
  const config = createConfig(partialConfig);
  return await run(config, client, logger);
};
