/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, KibanaRequest, Logger } from '@kbn/core/server';
import { ApiPrivileges } from '@kbn/core-security-server';
import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import type { InferenceServerClient } from '@kbn/inference-plugin/server';
import { PLUGIN_ID, ROUTE_VERSIONS } from '../../common/constants';
import { APIRoutes } from '../../common/types';
import { errorHandler } from '../utils/error_handler';
import { isTestableTaskType } from '../../common/type_guards';
import { testInferenceEndpoint } from '../lib/test_inference_endpoint';

export type GetInferenceClient = (
  request: KibanaRequest
) => Promise<Pick<InferenceServerClient, 'chatComplete'>>;

export const defineTestInferenceEndpointRoute = ({
  logger,
  router,
  getInferenceClient,
}: {
  logger: Logger;
  router: IRouter;
  getInferenceClient: GetInferenceClient;
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
        const endpoint = endpoints.find(({ inference_id: id }) => id === request.params.id);
        if (!endpoint) {
          return response.notFound({
            body: {
              message: i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.notFound', {
                defaultMessage: 'Endpoint [{id}] was not found',
                values: { id: request.params.id },
              }),
            },
          });
        }

        const { task_type: taskType } = endpoint;
        if (!isTestableTaskType(taskType)) {
          return response.badRequest({
            body: {
              message: i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.notTestable', {
                defaultMessage: 'Endpoint [{id}] cannot be tested',
                values: { id: request.params.id },
              }),
            },
          });
        }

        const result = await testInferenceEndpoint({
          inferenceClient: await getInferenceClient(request),
          esClient: asCurrentUser,
          logger,
          taskType,
          inferenceId: request.params.id,
        });

        return response.ok({ body: result, headers: { 'content-type': 'application/json' } });
      })
    );
};
