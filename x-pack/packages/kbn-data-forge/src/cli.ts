/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { cliOptionsToPartialConfig } from './lib/cli_to_partial_config';
import { createConfig, readConfig } from './lib/create_config';
import { getEsClient } from './lib/get_es_client';
import { parseCliOptions } from './lib/parse_cli_options';
import { run } from './run';

export async function cli() {
  const options = parseCliOptions();
  const partialConfig = options.config
    ? await readConfig(options.config)
    : cliOptionsToPartialConfig(options);
  const logger = new ToolingLog({ level: 'info', writeTo: process.stdout });
  const config = createConfig(partialConfig);
  const client = getEsClient(config);
  logger.info(
    `Starting index to ${config.elasticsearch.host} with a payload size of ${config.indexing.payloadSize} using ${config.indexing.concurrency} workers to index ${config.indexing.eventsPerCycle} events per cycle`
  );
  return run(config, client, logger);
}
