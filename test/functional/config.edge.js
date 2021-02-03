/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export default async function ({ readConfigFile }) {
  const defaultConfig = await readConfigFile(require.resolve('./config'));

  return {
    ...defaultConfig.getAll(),

    browser: {
      type: 'msedge',
    },

    junit: {
      reportName: 'MS Chromium Edge UI Functional Tests',
    },
  };
}
