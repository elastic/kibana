/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export default async function ({ readConfigFile }) {
  const baseConfig = await readConfigFile(require.resolve('./config.base.js'));

  return {
    ...baseConfig.getAll(),

    testFiles: [
      require.resolve('./apps/console'),
      require.resolve('./apps/dashboard/group4/dashboard_save'),
      require.resolve('./apps/dashboard_elements'),
      require.resolve('./apps/discover/classic'),
      require.resolve('./apps/discover/group1'),
      require.resolve('./apps/discover/group2'),
      require.resolve('./apps/home'),
      require.resolve('./apps/visualize/group5'),
    ],

    browser: {
      type: 'firefox',
    },

    suiteTags: {
      include: ['includeFirefox'],
      exclude: ['skipFirefox'],
    },

    junit: {
      reportName: 'Firefox UI Functional Tests',
    },
  };
}
