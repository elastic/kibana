/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { startBasic } from '../../../lib/start_basic';

export function registerStartBasicRoute(router, xpackInfo) {
  router.post('/start_basic', request => {
    return startBasic(request, xpackInfo);
  });
}
