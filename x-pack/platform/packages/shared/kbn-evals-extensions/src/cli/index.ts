/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RunWithCommands } from '@kbn/dev-cli-runner';
import { dashboardCmd } from './commands/dashboard';

export { dashboardCmd } from './commands/dashboard';

/**
 * Run the @kbn/evals-extensions CLI (extension commands for `node scripts/evals`).
 *
 * This is invoked by `scripts/evals.js` when the user runs an extension command
 * (e.g. `node scripts/evals dashboard`). The delegation happens at the script
 * level so that @kbn/evals does NOT import from @kbn/evals-extensions.
 */
export const run = async () => {
  await new RunWithCommands(
    {
      description: 'Evals Extensions CLI',
    },
    [dashboardCmd]
  ).execute();
};
