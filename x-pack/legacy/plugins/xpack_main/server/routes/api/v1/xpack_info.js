/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { convertKeysToSnakeCaseDeep } from '../../../../../../server/lib/key_case_converter';

/*
 * A route to provide the basic XPack info for the production cluster
 */
export function xpackInfoRoute(server) {
  server.route({
    method: 'GET',
    path: '/api/xpack/v1/info',
    handler() {
      const xPackInfo = server.plugins.xpack_main.info;

      return xPackInfo.isAvailable()
        ? convertKeysToSnakeCaseDeep(xPackInfo.toJSON())
        : Boom.notFound();
    },
  });
}
