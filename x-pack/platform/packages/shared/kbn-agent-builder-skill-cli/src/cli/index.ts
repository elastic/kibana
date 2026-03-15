/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RunWithCommands } from '@kbn/dev-cli-runner';
import { generateCmd } from './commands/generate';
import { validateCmd } from './commands/validate';
import { evalGenerateCmd } from './commands/eval_generate';
import { evalRunCmd } from './commands/eval_run';
import { exportCmd } from './commands/export';
import { importCmd } from './commands/import';

export async function run() {
  await new RunWithCommands(
    {
      description: 'Agent Builder skill development CLI',
      usage: 'node scripts/agent_builder_skill <command> [options]',
    },
    [generateCmd, validateCmd, evalGenerateCmd, evalRunCmd, exportCmd, importCmd]
  ).execute();
}
