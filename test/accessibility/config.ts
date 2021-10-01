/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { services } from './services';
import { pageObjects } from './page_objects';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('../functional/config'));

  return {
    ...functionalConfig.getAll(),

    testFiles: [
      // these 5 tests all load addSampleDataSet('flights')
      // only the last test does removeSampleDataSet('flights')
      require.resolve('./apps/dashboard'),
      require.resolve('./apps/dashboard_panel'),
      require.resolve('./apps/filter_panel'),
      require.resolve('./apps/home'),
      require.resolve('./apps/kibana_overview'),

      // next tests don't use sample data
      require.resolve('./apps/discover'),
      require.resolve('./apps/visualize'),
      require.resolve('./apps/management'),
      require.resolve('./apps/console'),
    ],
    pageObjects,
    services,

    junit: {
      reportName: 'Accessibility Tests',
    },
  };
}
