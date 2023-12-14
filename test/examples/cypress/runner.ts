/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve } from 'path';

import { withProcRunner } from '@kbn/dev-proc-runner';
import { FtrProviderContext } from '../../functional/ftr_provider_context';

/**
 * Executes a ProcRunner that supports `cypress run` and `cypress open` CLI commands
 * Returns a `testRunner` for an FTR configuration with tests implemented in Cypress, to be used in for E2E test campaign execution after the Kibana tests server is in a ready state.
 * {@link test/examples/package.json} for the yarn script implementations
 */
const ExamplePluginsCypressTestConfig = async (
  { getService }: FtrProviderContext,
  command: 'open' | 'run'
) => {
  const log = getService('log');

  await withProcRunner(log, async (procs) => {
    await procs.run('cypress', {
      cmd: 'yarn',
      args: ['cypress:' + command], // use a "script" entry from the test project's package.json
      cwd: resolve(__dirname),
      env: {
        ...process.env,
      },
      wait: true,
    });
  });
};

/**
 * Runs the `cypress open` command to launch the Cypress Test Runner app.
 */
export const ExamplePluginsCypressTestRunner = (context: FtrProviderContext) =>
  ExamplePluginsCypressTestConfig(context, 'open');

/**
 * Runs the `cypress run` command to run the Cypress tests headlessly.
 */
export const ExamplePluginsCypressTestHeadless = (context: FtrProviderContext) =>
  ExamplePluginsCypressTestConfig(context, 'run');
