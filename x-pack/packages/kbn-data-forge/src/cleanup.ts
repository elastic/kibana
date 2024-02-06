/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { createConfig } from './lib/create_config';
import { deleteIndexTemplate } from './lib/delete_index_template';
import { PartialConfig } from './types';

export async function cleanup({
  client,
  config: partialConfig,
  logger,
}: {
  client: Client;
  config: PartialConfig;
  logger: ToolingLog;
}) {
  const config = createConfig(partialConfig);
  return deleteIndexTemplate(config, client, logger);
}
