/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FtrConfigProviderContext } from '@kbn/test/types/ftr';
import path from 'path';
import fs from 'fs';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('../functional/config'));

  // Find all folders in ./plugins since we treat all them as plugin folder
  const allFiles = fs.readdirSync(path.resolve(__dirname, 'plugins'));
  const plugins = allFiles.filter((file) =>
    fs.statSync(path.resolve(__dirname, 'plugins', file)).isDirectory()
  );

  return {
    testFiles: [
      require.resolve('./test_suites/core'),
      require.resolve('./test_suites/custom_visualizations'),
      require.resolve('./test_suites/panel_actions'),
      require.resolve('./test_suites/core_plugins'),
      require.resolve('./test_suites/management'),
      require.resolve('./test_suites/doc_views'),
      require.resolve('./test_suites/application_links'),
      require.resolve('./test_suites/data_plugin'),
    ],
    services: {
      ...functionalConfig.get('services'),
    },
    pageObjects: functionalConfig.get('pageObjects'),
    servers: functionalConfig.get('servers'),
    esTestCluster: functionalConfig.get('esTestCluster'),
    apps: functionalConfig.get('apps'),
    esArchiver: {
      directory: path.resolve(__dirname, '../es_archives'),
    },
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
        ...plugins.map(
          (pluginDir) => `--plugin-path=${path.resolve(__dirname, 'plugins', pluginDir)}`
        ),
      ],
    },
  };
}
