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
import { testChat } from '../lib/test_inference_endpoint';

export const defineTestConnectorRoute = ({
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
      path: APIRoutes.TEST_CONNECTOR,
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
              connectorId: schema.string({ minLength: 1, maxLength: 256 }),
            }),
            body: schema.object({
              message: schema.string({ minLength: 1, maxLength: 2000 }),
              checkToolCalling: schema.maybe(schema.boolean()),
            }),
          },
        },
      },
      errorHandler(logger)(async (context, request, response) => {
        const result = await testChat({
          inferenceClient: await getInferenceClient(request),
          target: { connectorId: request.params.connectorId },
          message: request.body.message,
          checkToolCalling: request.body.checkToolCalling,
        });

        return response.ok({ body: result, headers: { 'content-type': 'application/json' } });
      })
    );
};
