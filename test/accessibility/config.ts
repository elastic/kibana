/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { FtrConfigProviderContext } from '@kbn/test/types/ftr';
import { services } from './services';
import { pageObjects } from './page_objects';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('../functional/config'));

  return {
    ...functionalConfig.getAll(),

    testFiles: [
      require.resolve('./apps/discover'),
      require.resolve('./apps/dashboard'),
      require.resolve('./apps/dashboard_panel'),
      require.resolve('./apps/visualize'),
      require.resolve('./apps/management'),
      require.resolve('./apps/console'),
      require.resolve('./apps/home'),
      require.resolve('./apps/filter_panel'),
      require.resolve('./apps/kibana_overview'),
    ],
    pageObjects,
    services,

    junit: {
      reportName: 'Accessibility Tests',
    },
  };
}
