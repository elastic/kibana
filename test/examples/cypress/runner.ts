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

const ExamplePluginsCypressTestConfig = async (
  { getService }: FtrProviderContext,
  command: 'open' | 'run'
) => {
  const log = getService('log');

  await withProcRunner(log, async (procs) => {
    await procs.run('cypress', {
      cmd: 'yarn',
      args: ['cypress:' + command],
      cwd: resolve(__dirname),
      env: {
        ...process.env,
      },
      wait: true,
    });
  });
};

/**
 * Using the Cypress Test Runner provides an interactive experience, allows you to see commands as they
 * execute, while also being able to see the app or component under test.
 */
export const ExamplePluginsCypressTestRunner = (context: FtrProviderContext) =>
  ExamplePluginsCypressTestConfig(context, 'open');

/**
 * Running Cypress headlessly is often used in CI.
 */
export const ExamplePluginsCypressTestHeadless = (context: FtrProviderContext) =>
  ExamplePluginsCypressTestConfig(context, 'run');
