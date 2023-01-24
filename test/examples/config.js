/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve } from 'path';
import { services } from '../plugin_functional/services';
import fs from 'fs';
import { REPO_ROOT } from '@kbn/repo-info';

export default async function ({ readConfigFile }) {
  const functionalConfig = await readConfigFile(require.resolve('../functional/config.base.js'));

  // Find all folders in /examples and /x-pack/examples since we treat all them as plugin folder
  const examplesFiles = fs.readdirSync(resolve(REPO_ROOT, 'examples'));
  const examples = examplesFiles.filter((file) =>
    fs.statSync(resolve(REPO_ROOT, 'examples', file)).isDirectory()
  );

  return {
    rootTags: ['runOutsideOfCiGroups'],
    testFiles: [
      require.resolve('./hello_world'),
      require.resolve('./embeddables'),
      require.resolve('./bfetch_explorer'),
      require.resolve('./ui_actions'),
      require.resolve('./state_sync'),
      require.resolve('./routing'),
      require.resolve('./expressions_explorer'),
      require.resolve('./data_view_field_editor_example'),
      require.resolve('./field_formats'),
      require.resolve('./partial_results'),
      require.resolve('./search'),
    ],
    services: {
      ...functionalConfig.get('services'),
      ...services,
    },
    uiSettings: {
      defaults: {
        'accessibility:disableAnimations': true,
        'dateFormat:tz': 'UTC',
      },
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
      reportName: 'Example plugin functional tests',
    },
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig.get('kbnTestServer.serverArgs'),
        // Required to load new platform plugins via `--plugin-path` flag.
        '--env.name=development',
        '--telemetry.optIn=false',
        ...examples.map(
          (exampleDir) => `--plugin-path=${resolve(REPO_ROOT, 'examples', exampleDir)}`
        ),
      ],
    },
  };
}
