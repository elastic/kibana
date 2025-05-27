/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import { FtrConfigProviderContext } from '@kbn/test';
import path from 'path';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('../functional/config.base.js'));

  return {
    testConfigCategory: ScoutTestRunConfigCategory.UI_TEST,
    rootTags: ['runOutsideOfCiGroups'],
    testFiles: [require.resolve('./test_suites/background_tasks')],
    services: {
      ...functionalConfig.get('services'),
    },
    pageObjects: functionalConfig.get('pageObjects'),
    servers: functionalConfig.get('servers'),
    esTestCluster: {
      ...functionalConfig.get('esTestCluster'),
      serverArgs: ['xpack.security.enabled=false'],
    },
    apps: functionalConfig.get('apps'),
    screenshots: functionalConfig.get('screenshots'),
    junit: {
      reportName: 'Plugin Functional Tests - node roles - background tasks',
    },
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs'),

        // Required to load new platform plugins via `--plugin-path` flag.
        '--env.name=development',
        // for testing set buffer duration to 0 to immediately flush counters into saved objects.
        '--usageCollection.usageCounters.bufferDuration=0',

        `--plugin-path=${path.resolve(__dirname, 'plugins', 'core_plugin_initializer_context')}`,
        '--node.roles=["ui","background_tasks"]',
      ],
    },
  };
}
