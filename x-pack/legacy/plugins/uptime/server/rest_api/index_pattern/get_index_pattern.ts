/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMServerLibs } from '../../lib/lib';

export const createGetIndexPatternRoute = (libs: UMServerLibs) => ({
  method: 'GET',
  path: '/api/uptime/index_pattern',
  tags: ['access:uptime'],
  handler: async (): Promise<any> => {
    return await libs.savedObjects.getUptimeIndexPattern();
  },
});
