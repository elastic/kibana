/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import path from 'path';
import fs from 'fs';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('../functional/config.base.js'));

  // Find all folders in ./plugins since we treat all them as plugin folder
  const allFiles = fs.readdirSync(path.resolve(__dirname, 'plugins'));
  const plugins = allFiles.filter((file) =>
    fs.statSync(path.resolve(__dirname, 'plugins', file)).isDirectory()
  );

  return {
    rootTags: ['runOutsideOfCiGroups'],
    testFiles: [
      require.resolve('./test_suites/usage_collection'),
      require.resolve('./test_suites/telemetry'),
      require.resolve('./test_suites/core'),
      require.resolve('./test_suites/custom_visualizations'),
      require.resolve('./test_suites/panel_actions'),
      require.resolve('./test_suites/core_plugins'),
      require.resolve('./test_suites/management'),
      require.resolve('./test_suites/application_links'),
      require.resolve('./test_suites/data_plugin'),
      require.resolve('./test_suites/saved_objects_management'),
      require.resolve('./test_suites/saved_objects_hidden_type'),
    ],
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
      reportName: 'Plugin Functional Tests',
    },
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs'),

        // Required to load new platform plugins via `--plugin-path` flag.
        '--env.name=development',
        '--corePluginDeprecations.oldProperty=hello',
        '--corePluginDeprecations.secret=100',
        '--corePluginDeprecations.noLongerUsed=still_using',
        // for testing set buffer duration to 0 to immediately flush counters into saved objects.
        '--usageCollection.usageCounters.bufferDuration=0',
        // explicitly enable the cloud integration plugins to validate the rendered config keys
        '--xpack.cloud_integrations.chat.enabled=true',
        '--xpack.cloud_integrations.chat.chatURL=a_string',
        '--xpack.cloud_integrations.experiments.enabled=true',
        '--xpack.cloud_integrations.experiments.launch_darkly.sdk_key=a_string',
        '--xpack.cloud_integrations.experiments.launch_darkly.client_id=a_string',
        '--xpack.cloud_integrations.full_story.enabled=true',
        '--xpack.cloud_integrations.full_story.org_id=a_string',
        '--xpack.cloud_integrations.gain_sight.enabled=true',
        '--xpack.cloud_integrations.gain_sight.org_id=a_string',
        ...plugins.map(
          (pluginDir) => `--plugin-path=${path.resolve(__dirname, 'plugins', pluginDir)}`
        ),
      ],
    },
  };
}
