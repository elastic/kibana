/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getPermissions } from '../../../lib/permissions';

export function registerPermissionsRoute(router, xpackInfo) {
  router.post('/permissions', request => {
    return getPermissions(request, xpackInfo);
  });
}
