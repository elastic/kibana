/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, IRouter, RequestHandlerContext } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { schema } from '@kbn/config-schema';
import type {
  InferenceInferenceEndpointInfo,
  InferenceTaskType,
} from '@elastic/elasticsearch/lib/api/types';

import type { InferenceServicesGetResponse } from '../types';
import { INFERENCE_ENDPOINT_INTERNAL_API_VERSION } from '../../common';
import { inferenceEndpointExists } from '../lib/inference_endpoint_exists';
import { unflattenObject } from '../utils/unflatten_object';

const inferenceEndpointSchema = schema.object({
  config: schema.object({
    inferenceId: schema.string(),
    provider: schema.string(),
    taskType: schema.string(),
    providerConfig: schema.any(),
    headers: schema.maybe(schema.recordOf(schema.string(), schema.string())),
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
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to es client',
        },
      },
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
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to es client',
        },
      },
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
          const taskSettings = unflattenObject(config?.providerConfig?.task_settings ?? {});
          const serviceSettings = config?.providerConfig?.service_settings ?? {};

          const serviceSettingsWithSecrets = {
            ...unflattenObject(serviceSettings),
            ...unflattenObject(secrets?.providerSecrets ?? {}),
          };

          const result = await esClient.inference.put({
            inference_id: config?.inferenceId ?? '',
            task_type: config?.taskType as InferenceTaskType,
            inference_config: {
              service: config?.provider,
              service_settings: serviceSettingsWithSecrets,
              ...(Object.keys(taskSettings).length ? { task_settings: taskSettings } : {}),
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
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to es client',
        },
      },
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
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to es client',
        },
      },
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
          const taskSettings = config?.providerConfig?.task_settings ?? {};

          // Currently, update API only allows 'api_key' and 'num_allocations'.
          const body = {
            service_settings: {
              ...(secrets?.providerSecrets?.api_key && {
                api_key: secrets.providerSecrets.api_key,
              }),
              ...(config?.providerConfig?.service_settings?.num_allocations !== undefined && {
                num_allocations: config.providerConfig.service_settings.num_allocations,
              }),
            },
            ...(Object.keys(taskSettings).length ? { task_settings: taskSettings } : {}),
          };

          const result = await esClient.transport.request<InferenceInferenceEndpointInfo>(
            {
              method: 'PUT',
              path: `/_inference/${config.taskType}/${config.inferenceId}/_update`,
              body: JSON.stringify(body),
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
