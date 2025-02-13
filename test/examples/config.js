/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { findTestPluginPaths } from '@kbn/test';
import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import { services } from '../plugin_functional/services';

export default async function ({ readConfigFile }) {
  const functionalConfig = await readConfigFile(require.resolve('../functional/config.base.js'));

  return {
    testConfigCategory: ScoutTestRunConfigCategory.UI_TEST,
    rootTags: ['runOutsideOfCiGroups'],
    testFiles: [
      require.resolve('./hello_world'),
      require.resolve('./ui_actions'),
      require.resolve('./state_sync'),
      require.resolve('./routing'),
      require.resolve('./expressions_explorer'),
      require.resolve('./data_view_field_editor_example'),
      require.resolve('./field_formats'),
      require.resolve('./partial_results'),
      require.resolve('./search'),
      require.resolve('./content_management'),
      require.resolve('./unified_field_list_examples'),
      require.resolve('./discover_customization_examples'),
      require.resolve('./error_boundary'),
      require.resolve('./response_stream'),
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
        ...findTestPluginPaths(resolve(REPO_ROOT, 'examples')),
      ],
    },
  };
}
