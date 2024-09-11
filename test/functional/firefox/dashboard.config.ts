/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable import/no-default-export */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const baseConfig = await readConfigFile(require.resolve('./config.base.ts'));

  return {
    ...baseConfig.getAll(),

    testFiles: [
      require.resolve('../apps/dashboard/group4/dashboard_save'),
      require.resolve('../apps/dashboard_elements/controls/common'),
      require.resolve('../apps/dashboard_elements/controls/options_list'),
      require.resolve('../apps/dashboard_elements/image_embeddable'),
      require.resolve('../apps/dashboard_elements/input_control_vis'),
      require.resolve('../apps/dashboard_elements/markdown/_markdown_vis.ts'),
    ],

    junit: {
      reportName: 'Firefox UI Functional Tests - Dashboard',
    },
  };
}
