/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, IRouter, RequestHandlerContext } from '@kbn/core/server';
import { Logger } from '@kbn/logging';
import { schema } from '@kbn/config-schema';
import {
  InferenceInferenceEndpointInfo,
  InferenceTaskType,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { InferenceServicesGetResponse } from '../types';
import { INFERENCE_ENDPOINT_INTERNAL_API_VERSION } from '../../common';
import { inferenceEndpointExists } from '../lib/inference_endpoint_exists';
import { unflattenObject } from '../utils/unflatten_object';

const inferenceEndpointSchema = schema.object({
  config: schema.object({
    inferenceId: schema.string(),
    provider: schema.string(),
    taskType: schema.string(),
    providerConfig: schema.any(),
  }),
  secrets: schema.object({
    providerSecrets: schema.any(),
  }),
});

export const getInferenceServicesRoute = (
  router: IRouter<RequestHandlerContext>,
  logger: Logger
) => {
  router.versioned
    .get({
      access: 'internal',
      path: '/internal/_inference/_services',
    })
    .addVersion(
      {
        version: INFERENCE_ENDPOINT_INTERNAL_API_VERSION,
        validate: {},
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<InferenceServicesGetResponse>> => {
        try {
          const esClient = (await context.core).elasticsearch.client.asInternalUser;

          const result = await esClient.transport.request<InferenceServicesGetResponse>({
            method: 'GET',
            path: `/_inference/_services`,
          });

          return response.ok({
            body: result,
          });
        } catch (err) {
          logger.error(err);
          return response.customError({
            body: { message: err.message },
            statusCode: err.statusCode,
          });
        }
      }
    );

  router.versioned
    .post({
      access: 'internal',
      path: '/internal/_inference/_add',
    })
    .addVersion(
      {
        version: INFERENCE_ENDPOINT_INTERNAL_API_VERSION,
        validate: {
          request: {
            body: inferenceEndpointSchema,
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<InferenceInferenceEndpointInfo>> => {
        try {
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;

          const { config, secrets } = request.body;

          const serviceSettings = {
            ...unflattenObject(config?.providerConfig ?? {}),
            ...unflattenObject(secrets?.providerSecrets ?? {}),
          };

          const result = await esClient.inference.put({
            inference_id: config?.inferenceId ?? '',
            task_type: config?.taskType as InferenceTaskType,
            inference_config: {
              service: config?.provider,
              service_settings: serviceSettings,
            },
          });

          return response.ok({
            body: result,
          });
        } catch (err) {
          logger.error(err);
          return response.customError({
            body: err.message,
            statusCode: err.statusCode,
          });
        }
      }
    );

  router.versioned
    .get({
      access: 'internal',
      path: '/internal/_inference/_exists/{inferenceId}',
    })
    .addVersion(
      {
        version: INFERENCE_ENDPOINT_INTERNAL_API_VERSION,
        validate: {
          request: {
            params: schema.object({
              inferenceId: schema.string(),
            }),
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<{ isEndpointExists: boolean }>> => {
        try {
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;

          const result = await inferenceEndpointExists(esClient, request.params.inferenceId);

          return response.ok({
            body: { isEndpointExists: result },
          });
        } catch (err) {
          logger.error(err);
          return response.customError({
            body: err.message,
            statusCode: err.statusCode,
          });
        }
      }
    );

  router.versioned
    .put({
      access: 'internal',
      path: '/internal/_inference/_update',
    })
    .addVersion(
      {
        version: INFERENCE_ENDPOINT_INTERNAL_API_VERSION,
        validate: {
          request: {
            body: inferenceEndpointSchema,
          },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<InferenceInferenceEndpointInfo>> => {
        try {
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;

          const { config, secrets } = request.body;

          // currently update api only allows api_key and num_allocations
          const serviceSettings = {
            service_settings: {
              ...(secrets?.providerSecrets?.api_key && {
                api_key: secrets.providerSecrets.api_key,
              }),
              ...(config?.providerConfig?.num_allocations !== undefined && {
                num_allocations: config.providerConfig.num_allocations,
              }),
            },
          };

          const result = await esClient.transport.request<InferenceInferenceEndpointInfo>(
            {
              method: 'PUT',
              path: `/_inference/${config.taskType}/${config.inferenceId}/_update`,
              body: JSON.stringify(serviceSettings),
            },
            {
              headers: {
                'content-type': 'application/json',
              },
            }
          );

          return response.ok({
            body: result,
          });
        } catch (err) {
          logger.error(err);
          return response.customError({
            body: err.message,
            statusCode: err.statusCode,
          });
        }
      }
    );
};
