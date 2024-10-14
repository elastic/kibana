/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { Config } from '../types';
import { ingestPipelines } from '../data_sources';

export async function installIngestPipelines(
  config: Config,
  client: Client,
  logger: ToolingLog
): Promise<void> {
  const { dataset } = config.indexing;
  const pipelines = ingestPipelines[dataset];
  const pipelineNames = pipelines.map(({ id }) => id).join(',');
  logger.info(`Installing ingest pipelines (${pipelineNames})`);
  for (const pipeline of pipelines) {
    await client.ingest.putPipeline(pipeline);
  }
}
