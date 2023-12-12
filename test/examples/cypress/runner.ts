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

export async function ExamplePluginsHeadlessTestRunner({
  // what to say about this
  getService,
}: FtrProviderContext) {
  const log = getService('log');

  await withProcRunner(log, async (procs) => {
    await procs.run('cypress', {
      cmd: 'yarn',
      args: ['cypress:open'], // FIXME: could be :open or :run depending on choice
      cwd: resolve(__dirname),
      env: {
        ...process.env,
      },
      wait: true,
    });
  });
}
