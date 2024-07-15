/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { Config } from '../types';

const processors = [
  {
    set: {
      field: 'event.ingested',
      value: '{{{_ingest.timestamp}}}',
    },
  },
];

export async function installDefaultIngestPipeline(
  _config: Config,
  client: Client,
  logger: ToolingLog
) {
  logger.info('Installing default ingest pipeline: kbn-data-forge-add-event-ingested');
  return client.ingest.putPipeline({
    id: 'kbn-data-forge-add-event-ingested',
    processors,
    version: 1,
  });
}
