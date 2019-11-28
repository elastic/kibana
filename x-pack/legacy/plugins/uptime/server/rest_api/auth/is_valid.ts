/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMServerLibs } from '../../lib/lib';

export const createIsValidRoute = (libs: UMServerLibs) => ({
  method: 'GET',
  path: '/api/uptime/is_valid',
  handler: async (request: any): Promise<boolean> => await libs.auth.requestIsValid(request),
  options: {
    tags: ['access:uptime'],
  },
});
