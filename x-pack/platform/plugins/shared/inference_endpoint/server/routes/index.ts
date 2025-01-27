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
import { unflattenObject } from '../utils/unflatten_object';

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
            body: schema.object({
              config: schema.object({
                inferenceId: schema.string(),
                provider: schema.string(),
                taskType: schema.string(),
                providerConfig: schema.any(),
              }),
              secrets: schema.object({
                providerSecrets: schema.any(),
              }),
            }),
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
          const taskSettings = {};
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
              task_settings: taskSettings,
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
};
