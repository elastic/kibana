/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { SecretsClient } from '@kbn/secrets';
import { handleSecretsRouteError } from './handle_secrets_route_error';
import {
  createSecretBodySchema,
  replaceSecretBodySchema,
  secretNameParamsSchema,
} from './route_schemas';
import { SECRETS_LIST_SECURITY, SECRETS_MANAGE_SECURITY } from './route_security';
import { INTERNAL_API_VERSION } from '../api/routes/utils/route_constants';
import { withAvailabilityCheck } from '../api/routes/utils/with_availability_check';
import type { WorkflowsRouter } from '../types';

const SECRETS_PATH = '/internal/workflows/secrets';
const SECRET_PATH = `${SECRETS_PATH}/{name}`;

export interface SecretsRouteDependencies {
  router: WorkflowsRouter;
  /** Returns the secrets of the request's space that Workflows may use. */
  getSecretsClient: (request: KibanaRequest) => Promise<SecretsClient>;
}

/**
 * Registers the routes that list, create, replace and delete workflow secrets.
 * No route returns a value.
 */
export const registerSecretsRoutes = ({
  router,
  getSecretsClient,
}: SecretsRouteDependencies): void => {
  router.versioned
    .get({ path: SECRETS_PATH, access: 'internal', security: SECRETS_LIST_SECURITY })
    .addVersion(
      { version: INTERNAL_API_VERSION, validate: false },
      withAvailabilityCheck(async (_context, request, response) => {
        try {
          const client = await getSecretsClient(request);
          return response.ok({ body: { secrets: await client.list() } });
        } catch (error) {
          return handleSecretsRouteError({ response, error });
        }
      })
    );

  router.versioned
    .post({ path: SECRETS_PATH, access: 'internal', security: SECRETS_MANAGE_SECURITY })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: { request: { body: createSecretBodySchema } },
      },
      withAvailabilityCheck(async (_context, request, response) => {
        try {
          const client = await getSecretsClient(request);
          return response.ok({ body: await client.create(request.body) });
        } catch (error) {
          return handleSecretsRouteError({ response, error });
        }
      })
    );

  router.versioned
    .put({ path: SECRET_PATH, access: 'internal', security: SECRETS_MANAGE_SECURITY })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: { request: { params: secretNameParamsSchema, body: replaceSecretBodySchema } },
      },
      withAvailabilityCheck(async (_context, request, response) => {
        try {
          const client = await getSecretsClient(request);
          const { name } = request.params;
          return response.ok({ body: await client.replace({ name, ...request.body }) });
        } catch (error) {
          return handleSecretsRouteError({ response, error });
        }
      })
    );

  router.versioned
    .delete({ path: SECRET_PATH, access: 'internal', security: SECRETS_MANAGE_SECURITY })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: { request: { params: secretNameParamsSchema } },
      },
      withAvailabilityCheck(async (_context, request, response) => {
        try {
          const client = await getSecretsClient(request);
          await client.delete(request.params);
          return response.noContent();
        } catch (error) {
          return handleSecretsRouteError({ response, error });
        }
      })
    );
};
