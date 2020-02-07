/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../client/call_with_request_factory';
import { wrapError } from '../client/errors';

export function notificationRoutes({ commonRouteConfig, elasticsearchPlugin, route }) {
  route({
    method: 'GET',
    path: '/api/ml/notification_settings',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const params = {
        includeDefaults: true,
        filterPath: '**.xpack.notification',
      };
      return callWithRequest('cluster.getSettings', params).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });
}
