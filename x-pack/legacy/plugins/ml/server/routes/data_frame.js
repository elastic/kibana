/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../client/call_with_request_factory';
import { wrapError } from '../client/errors';
import { transformAuditMessagesProvider } from '../models/data_frame/transform_audit_messages';
import { transformServiceProvider } from '../models/data_frame';

export function dataFrameRoutes({ commonRouteConfig, elasticsearchPlugin, route }) {

  route({
    method: 'GET',
    path: '/api/ml/_data_frame/transforms',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      return callWithRequest('ml.getDataFrameTransforms')
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

  route({
    method: 'GET',
    path: '/api/ml/_data_frame/transforms/{transformId}',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const { transformId } = request.params;
      return callWithRequest('ml.getDataFrameTransforms', { transformId })
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

  route({
    method: 'GET',
    path: '/api/ml/_data_frame/transforms/_stats',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      return callWithRequest('ml.getDataFrameTransformsStats')
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

  route({
    method: 'GET',
    path: '/api/ml/_data_frame/transforms/{transformId}/_stats',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const { transformId } = request.params;
      return callWithRequest('ml.getDataFrameTransformsStats', { transformId })
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

  route({
    method: 'PUT',
    path: '/api/ml/_data_frame/transforms/{transformId}',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const { transformId } = request.params;
      return callWithRequest('ml.createDataFrameTransform', { body: request.payload, transformId })
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

  route({
    method: 'POST',
    path: '/api/ml/_data_frame/transforms/delete_transforms',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const { deleteTransforms } = transformServiceProvider(callWithRequest);
      const { transformsInfo } = request.payload;
      return deleteTransforms(transformsInfo)
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

  route({
    method: 'POST',
    path: '/api/ml/_data_frame/transforms/_preview',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      return callWithRequest('ml.getDataFrameTransformsPreview', { body: request.payload })
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

  route({
    method: 'POST',
    path: '/api/ml/_data_frame/transforms/start_transforms',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const { startTransforms } = transformServiceProvider(callWithRequest);
      const { transformsInfo } = request.payload;
      return startTransforms(transformsInfo)
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

  route({
    method: 'POST',
    path: '/api/ml/_data_frame/transforms/stop_transforms',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const { stopTransforms } = transformServiceProvider(callWithRequest);
      const { transformsInfo } = request.payload;
      return stopTransforms(transformsInfo)
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

  route({
    method: 'GET',
    path: '/api/ml/_data_frame/transforms/{transformId}/messages',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const { getTransformAuditMessages } = transformAuditMessagesProvider(callWithRequest);
      const { transformId } = request.params;
      return getTransformAuditMessages(transformId)
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

}
