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
import type { WorkflowSecretsListResponse } from '../../common/lib/secrets/api';
import { WORKFLOW_SECRET_ROUTE, WORKFLOW_SECRETS_ROUTE } from '../../common/lib/secrets/api';
import { withAvailabilityCheck } from '../api/routes/utils/with_availability_check';
import type { WorkflowsRouter } from '../types';

export interface SecretsRouteDependencies {
  router: WorkflowsRouter;
  /** Returns the secrets of the request's space that Workflows may use. */
  getSecretsClient: (request: KibanaRequest) => Promise<SecretsClient>;
}

/**
 * Registers the routes that list, create, replace and delete workflow secrets.
 * No route returns a value.
 * TODO: version these routes (`router.versioned`, `INTERNAL_API_VERSION`) like the other
 * internal Workflows routes. They are unversioned during the POC so that Dev Tools can call them.
 */
export const registerSecretsRoutes = ({
  router,
  getSecretsClient,
}: SecretsRouteDependencies): void => {
  router.get(
    {
      path: WORKFLOW_SECRETS_ROUTE,
      security: SECRETS_LIST_SECURITY,
      options: { access: 'internal' },
      validate: false,
    },
    withAvailabilityCheck(async (_context, request, response) => {
      try {
        const client = await getSecretsClient(request);
        const body: WorkflowSecretsListResponse = { secrets: await client.list() };
        return response.ok({ body });
      } catch (error) {
        return handleSecretsRouteError({ response, error });
      }
    })
  );

  router.post(
    {
      path: WORKFLOW_SECRETS_ROUTE,
      security: SECRETS_MANAGE_SECURITY,
      options: { access: 'internal' },
      validate: { body: createSecretBodySchema },
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

  router.put(
    {
      path: WORKFLOW_SECRET_ROUTE,
      security: SECRETS_MANAGE_SECURITY,
      options: { access: 'internal' },
      validate: { params: secretNameParamsSchema, body: replaceSecretBodySchema },
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

  router.delete(
    {
      path: WORKFLOW_SECRET_ROUTE,
      security: SECRETS_MANAGE_SECURITY,
      options: { access: 'internal' },
      validate: { params: secretNameParamsSchema },
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
