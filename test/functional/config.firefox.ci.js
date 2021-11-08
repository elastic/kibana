/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const CI_GROUPS = parseInt(process.env.CI_GROUPS || '11');
const CI_GROUPS_RANGE = [...Array(CI_GROUPS).keys()];
const TOTAL_JOBS = parseInt(process.env.BUILDKITE_PARALLEL_JOB_COUNT || 1);
const THIS_JOB = parseInt(process.env.BUILDKITE_PARALLEL_JOB || 0);

const CI_GROUPS_TO_EXECUTE = CI_GROUPS_RANGE.filter((i) => i % TOTAL_JOBS === THIS_JOB);

export default async function ({ readConfigFile }) {
  const firefoxConfig = await readConfigFile(require.resolve('./config.firefox'));

  return {
    ...firefoxConfig.getAll(),

    suiteTags: {
      exclude: ['skipFirefox'],
      include: CI_GROUPS_TO_EXECUTE.map((i) => `ciGroup${i + 1}`),
    },
  };
}
