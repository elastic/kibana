/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../client/call_with_request_factory';
import { wrapError } from '../client/errors';

export function dataFeedRoutes({ commonRouteConfig, elasticsearchPlugin, route }) {
  route({
    method: 'GET',
    path: '/api/ml/datafeeds',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      return callWithRequest('ml.datafeeds').catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'GET',
    path: '/api/ml/datafeeds/{datafeedId}',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const datafeedId = request.params.datafeedId;
      return callWithRequest('ml.datafeeds', { datafeedId }).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'GET',
    path: '/api/ml/datafeeds/_stats',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      return callWithRequest('ml.datafeedStats').catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'GET',
    path: '/api/ml/datafeeds/{datafeedId}/_stats',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const datafeedId = request.params.datafeedId;
      return callWithRequest('ml.datafeedStats', { datafeedId }).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'PUT',
    path: '/api/ml/datafeeds/{datafeedId}',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const datafeedId = request.params.datafeedId;
      const body = request.payload;
      return callWithRequest('ml.addDatafeed', { datafeedId, body }).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'POST',
    path: '/api/ml/datafeeds/{datafeedId}/_update',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const datafeedId = request.params.datafeedId;
      const body = request.payload;
      return callWithRequest('ml.updateDatafeed', { datafeedId, body }).catch(resp =>
        wrapError(resp)
      );
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'DELETE',
    path: '/api/ml/datafeeds/{datafeedId}',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const options = {
        datafeedId: request.params.datafeedId,
      };
      const force = request.query.force;
      if (force !== undefined) {
        options.force = force;
      }
      return callWithRequest('ml.deleteDatafeed', options).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'POST',
    path: '/api/ml/datafeeds/{datafeedId}/_start',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const datafeedId = request.params.datafeedId;
      const start = request.payload.start;
      const end = request.payload.end;
      return callWithRequest('ml.startDatafeed', { datafeedId, start, end }).catch(resp =>
        wrapError(resp)
      );
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'POST',
    path: '/api/ml/datafeeds/{datafeedId}/_stop',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const datafeedId = request.params.datafeedId;
      return callWithRequest('ml.stopDatafeed', { datafeedId }).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'GET',
    path: '/api/ml/datafeeds/{datafeedId}/_preview',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const datafeedId = request.params.datafeedId;
      return callWithRequest('ml.datafeedPreview', { datafeedId }).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });
}
