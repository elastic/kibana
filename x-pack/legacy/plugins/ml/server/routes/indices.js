/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../client/call_with_request_factory';
import { wrapError } from '../client/errors';

export function indicesRoutes({ commonRouteConfig, elasticsearchPlugin, route }) {
  route({
    method: 'POST',
    path: '/api/ml/indices/field_caps',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const index = request.payload.index;
      let fields = '*';
      if (request.payload.fields !== undefined && Array.isArray(request.payload.fields)) {
        fields = request.payload.fields.join(',');
      }

      return callWithRequest('fieldCaps', { index, fields }).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });
}
