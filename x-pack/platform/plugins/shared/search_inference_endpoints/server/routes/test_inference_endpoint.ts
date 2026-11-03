/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, KibanaRequest, Logger } from '@kbn/core/server';
import { ApiPrivileges } from '@kbn/core-security-server';
import { schema } from '@kbn/config-schema';
import type { InferenceServerClient } from '@kbn/inference-plugin/server';
import { PLUGIN_ID, ROUTE_VERSIONS } from '../../common/constants';
import { APIRoutes } from '../../common/types';
import { errorHandler } from '../utils/error_handler';
import { isTestableTaskType } from '../../common/type_guards';
import { testInferenceEndpoint } from '../lib/test_inference_endpoint';

export const defineTestInferenceEndpointRoute = ({
  logger,
  router,
  getInferenceClient,
}: {
  logger: Logger;
  router: IRouter;
  getInferenceClient: (
    request: KibanaRequest
  ) => Promise<Pick<InferenceServerClient, 'chatComplete'>>;
}) => {
  router.versioned
    .post({
      access: 'internal',
      path: APIRoutes.TEST_INFERENCE_ENDPOINT,
      security: {
        authz: {
          requiredPrivileges: [ApiPrivileges.manage(PLUGIN_ID)],
        },
      },
    })
    .addVersion(
      {
        version: ROUTE_VERSIONS.v1,
        security: {
          authz: {
            requiredPrivileges: [ApiPrivileges.manage(PLUGIN_ID)],
          },
        },
        validate: {
          request: {
            params: schema.object({
              id: schema.string({ minLength: 1, maxLength: 256 }),
            }),
            body: schema.object({
              message: schema.string({ minLength: 1, maxLength: 2000 }),
              documents: schema.maybe(
                schema.arrayOf(schema.string({ minLength: 1, maxLength: 2000 }), {
                  minSize: 1,
                  maxSize: 20,
                })
              ),
            }),
          },
        },
      },
      errorHandler(logger)(async (context, request, response) => {
        const {
          client: { asCurrentUser },
        } = (await context.core).elasticsearch;

        const { endpoints } = await asCurrentUser.inference.get({
          inference_id: request.params.id,
        });
        const taskType = endpoints[0]?.task_type;
        if (!taskType || !isTestableTaskType(taskType)) {
          return response.badRequest({
            body: { message: `Endpoint [${request.params.id}] cannot be tested` },
          });
        }

        const { message, documents } = request.body;
        if (taskType === 'rerank' && !documents) {
          return response.badRequest({
            body: { message: 'Documents are required to test a rerank endpoint' },
          });
        }

        const result = await testInferenceEndpoint({
          inferenceClient: await getInferenceClient(request),
          esClient: asCurrentUser,
          taskType,
          inferenceId: request.params.id,
          message,
          documents,
        });

        return response.ok({ body: result, headers: { 'content-type': 'application/json' } });
      })
    );
};
