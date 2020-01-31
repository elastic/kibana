/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../client/call_with_request_factory';
import { wrapError } from '../client/errors';
import { analyticsAuditMessagesProvider } from '../models/data_frame_analytics/analytics_audit_messages';

export function dataFrameAnalyticsRoutes({ commonRouteConfig, elasticsearchPlugin, route }) {
  route({
    method: 'GET',
    path: '/api/ml/data_frame/analytics',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      return callWithRequest('ml.getDataFrameAnalytics').catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'GET',
    path: '/api/ml/data_frame/analytics/{analyticsId}',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const { analyticsId } = request.params;
      return callWithRequest('ml.getDataFrameAnalytics', { analyticsId }).catch(resp =>
        wrapError(resp)
      );
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'GET',
    path: '/api/ml/data_frame/analytics/_stats',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      return callWithRequest('ml.getDataFrameAnalyticsStats').catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'GET',
    path: '/api/ml/data_frame/analytics/{analyticsId}/_stats',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const { analyticsId } = request.params;
      return callWithRequest('ml.getDataFrameAnalyticsStats', { analyticsId }).catch(resp =>
        wrapError(resp)
      );
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'PUT',
    path: '/api/ml/data_frame/analytics/{analyticsId}',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const { analyticsId } = request.params;
      return callWithRequest('ml.createDataFrameAnalytics', {
        body: request.payload,
        analyticsId,
      }).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'POST',
    path: '/api/ml/data_frame/_evaluate',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      return callWithRequest('ml.evaluateDataFrameAnalytics', { body: request.payload }).catch(
        resp => wrapError(resp)
      );
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'DELETE',
    path: '/api/ml/data_frame/analytics/{analyticsId}',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const { analyticsId } = request.params;
      return callWithRequest('ml.deleteDataFrameAnalytics', { analyticsId }).catch(resp =>
        wrapError(resp)
      );
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'POST',
    path: '/api/ml/data_frame/analytics/{analyticsId}/_start',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const options = {
        analyticsId: request.params.analyticsId,
      };

      return callWithRequest('ml.startDataFrameAnalytics', options).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'POST',
    path: '/api/ml/data_frame/analytics/{analyticsId}/_stop',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const options = {
        analyticsId: request.params.analyticsId,
      };

      if (request.query.force !== undefined) {
        options.force = request.query.force;
      }

      return callWithRequest('ml.stopDataFrameAnalytics', options).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'GET',
    path: '/api/ml/data_frame/analytics/{analyticsId}/messages',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const { getAnalyticsAuditMessages } = analyticsAuditMessagesProvider(callWithRequest);
      const { analyticsId } = request.params;
      return getAnalyticsAuditMessages(analyticsId).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });
}
