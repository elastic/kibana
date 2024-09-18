/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { Client } from '@elastic/elasticsearch';
import { setupKibanaSystemUser } from './lib/setup_kibana_system_user';
import type { Config } from './types';
import { installAssets } from './lib/install_assets';
import { indexSchedule } from './lib/index_schedule';
import { installIndexTemplate } from './lib/install_index_template';
import { indices } from './lib/indices';
import { installDefaultIngestPipeline } from './lib/install_default_ingest_pipeline';
import { installDefaultComponentTemplate } from './lib/install_default_component_template';

export async function run(config: Config, client: Client, logger: ToolingLog) {
  await installDefaultComponentTemplate(config, client, logger);
  await installDefaultIngestPipeline(config, client, logger);
  await installIndexTemplate(config, client, logger);
  if (config.elasticsearch.installKibanaUser) {
    await setupKibanaSystemUser(config, client, logger);
  }
  await installAssets(config, logger);
  await indexSchedule(config, client, logger);
  const indicesCreated = [...indices];
  indices.clear();
  await client.indices.refresh({ index: indicesCreated, ignore_unavailable: true });
  return indicesCreated;
}
