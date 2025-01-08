/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { KibanaServerError } from '@kbn/kibana-utils-plugin/common';
import { schema } from '@kbn/config-schema';
import { InferenceEndpoint } from '../../../../common';
import { addBasePath } from '..';
import { RouteDependencies } from '../../../types';
import { addInferenceEndpoint } from '../../../lib/add_inference_endpoint';

function isKibanaServerError(error: any): error is KibanaServerError {
  return error.statusCode && error.message;
}

export function registerGetAllRoute({ router, lib: { handleEsError } }: RouteDependencies) {
  // Get all inference models
  router.get(
    {
      path: addBasePath('/inference/all'),
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on es client for authorization',
        },
      },
      validate: {},
    },
    async (context, request, response) => {
      const { client } = (await context.core).elasticsearch;

      // TODO: Use the client's built-in function rather than the transport when it's available
      try {
        const { endpoints } = await client.asCurrentUser.transport.request<{
          endpoints: InferenceAPIConfigResponse[];
        }>({
          method: 'GET',
          path: `/_inference/_all`,
        });

        return response.ok({
          body: endpoints,
        });
      } catch (error) {
        return handleEsError({ error, response });
      }
    }
  );

  router.put(
    {
      path: addBasePath(`/inference/{taskType}/{inferenceId}`),
      validate: {
        params: schema.object({
          taskType: schema.string(),
          inferenceId: schema.string(),
        }),
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
    async (context, request, response) => {
      try {
        const {
          client: { asCurrentUser },
        } = (await context.core).elasticsearch;

        const { config, secrets }: InferenceEndpoint = request.body;
        const result = await addInferenceEndpoint(asCurrentUser, config, secrets);

        return response.ok({
          body: result,
          headers: { 'content-type': 'application/json' },
        });
      } catch (error) {
        if (isKibanaServerError(error)) {
          return response.customError({ statusCode: error.statusCode, body: error.message });
        }
        throw error;
      }
    }
  );
}
