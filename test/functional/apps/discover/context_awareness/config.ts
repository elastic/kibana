/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FtrConfigProviderContext } from '@kbn/test';
import path from 'path';
import {
  KibanaEBTUIProvider,
  KibanaEBTServerProvider,
} from '../../../../analytics/services/kibana_ebt';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('../../../config.base.js'));
  const baseConfig = functionalConfig.getAll();

  return {
    ...baseConfig,
    testFiles: [require.resolve('.')],
    kbnTestServer: {
      ...baseConfig.kbnTestServer,
      serverArgs: [
        ...baseConfig.kbnTestServer.serverArgs,
        `--discover.experimental.enabledProfiles=${JSON.stringify([
          'example-root-profile',
          'example-solution-view-root-profile',
          'example-data-source-profile',
          'example-document-profile',
        ])}`,
        `--plugin-path=${path.resolve(
          __dirname,
          '../../../../analytics/plugins/analytics_ftr_helpers'
        )}`,
      ],
    },
    services: {
      ...baseConfig.services,
      kibana_ebt_server: KibanaEBTServerProvider,
      kibana_ebt_ui: KibanaEBTUIProvider,
    },
  };
}
