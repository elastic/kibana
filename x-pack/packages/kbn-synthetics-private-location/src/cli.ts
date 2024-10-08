/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { parseCliOptions } from './lib/parse_cli_options';
import { CliOptions } from './types';
import { run } from './run';

export async function cli(cliOptions?: CliOptions) {
  const options = cliOptions ?? parseCliOptions();
  const logger = new ToolingLog({ level: 'info', writeTo: process.stdout });
  return run(options, logger);
}
