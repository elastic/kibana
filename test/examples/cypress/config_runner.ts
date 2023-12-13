/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { ExamplePluginsCypressTestRunner } from './runner';

// eslint-disable-next-line import/no-default-export
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const commonConfig = await readConfigFile(require.resolve('./_config_common'));

  return {
    junit: { reportName: 'Example plugin E2E tests in Cypress Test Runner' },
    ...commonConfig.getAll(),
    testRunner: ExamplePluginsCypressTestRunner,
  };
}
