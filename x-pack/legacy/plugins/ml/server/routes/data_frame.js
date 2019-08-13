/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../client/call_with_request_factory';
import { wrapError } from '../client/errors';
import { transformAuditMessagesProvider } from '../models/data_frame/transform_audit_messages';

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
    path: '/api/ml/_data_frame/transforms/{jobId}',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const { jobId } = request.params;
      return callWithRequest('ml.getDataFrameTransforms', { jobId })
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
    path: '/api/ml/_data_frame/transforms/{jobId}/_stats',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const { jobId } = request.params;
      return callWithRequest('ml.getDataFrameTransformsStats', { jobId })
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

  route({
    method: 'PUT',
    path: '/api/ml/_data_frame/transforms/{jobId}',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const { jobId } = request.params;
      return callWithRequest('ml.createDataFrameTransformsJob', { body: request.payload, jobId })
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

  route({
    method: 'DELETE',
    path: '/api/ml/_data_frame/transforms/{jobId}',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const { jobId } = request.params;
      return callWithRequest('ml.deleteDataFrameTransformsJob', { jobId })
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
    path: '/api/ml/_data_frame/transforms/{jobId}/_start',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const options = {
        jobId: request.params.jobId
      };

      if (request.query.force !== undefined) {
        options.force = request.query.force;
      }

      return callWithRequest('ml.startDataFrameTransformsJob', options)
        .catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig
    }
  });

  route({
    method: 'POST',
    path: '/api/ml/_data_frame/transforms/{jobId}/_stop',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const options = {
        jobId: request.params.jobId
      };

      if (request.query.force !== undefined) {
        options.force = request.query.force;
      }

      if (request.query.wait_for_completion !== undefined) {
        options.waitForCompletion = request.query.wait_for_completion;
      }

      return callWithRequest('ml.stopDataFrameTransformsJob', options)
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
