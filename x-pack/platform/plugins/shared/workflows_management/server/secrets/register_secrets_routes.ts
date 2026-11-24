/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type {
  SecretConnectorsResponse,
  SecretsClient,
  SecretsListResponse,
  SecretUsageCountsResponse,
  SecretUsageResponse,
} from '@kbn/secrets';
import {
  createSecretBodySchema,
  handleSecretsRouteError,
  secretNameParamsSchema,
  updateSecretBodySchema,
} from '@kbn/secrets-plugin/server';
import {
  SECRETS_LIST_SECURITY,
  SECRETS_MANAGE_SECURITY,
  SECRETS_USAGE_SECURITY,
} from './route_security';
import {
  WORKFLOW_SECRET_CONNECTORS_ROUTE,
  WORKFLOW_SECRET_ROUTE,
  WORKFLOW_SECRET_TEST_ROUTE,
  WORKFLOW_SECRET_USAGE_ROUTE,
  WORKFLOW_SECRETS_ROUTE,
  WORKFLOW_SECRETS_USAGE_ROUTE,
} from '../../common/lib/secrets/api';
import { withAvailabilityCheck } from '../api/routes/utils/with_availability_check';
import type { WorkflowsRouter } from '../types';

export interface SecretsRouteDependencies {
  router: WorkflowsRouter;
  /** Returns the secrets of the request's space that Workflows may use. */
  getSecretsClient: (request: KibanaRequest) => Promise<SecretsClient>;
  /** Counts the workflows of the request's space that use each secret, as the user may see them. */
  getSecretUsageCounts: (request: KibanaRequest) => Promise<SecretUsageCountsResponse>;
  /** Lists the workflows of the request's space that use one secret, as the user may see them. */
  getSecretUsage: (request: KibanaRequest, name: string) => Promise<SecretUsageResponse>;
}

/**
 * Registers the routes that list, create, update, delete and test workflow secrets, and that
 * tell which workflows use them. No route returns a value.
 * TODO: version these routes (`router.versioned`, `INTERNAL_API_VERSION`) like the other
 * internal Workflows routes. They are unversioned during the POC so that Dev Tools can call them.
 */
export const registerSecretsRoutes = ({
  router,
  getSecretsClient,
  getSecretUsageCounts,
  getSecretUsage,
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
        const body: SecretsListResponse = { secrets: await client.list() };
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

  router.patch(
    {
      path: WORKFLOW_SECRET_ROUTE,
      security: SECRETS_MANAGE_SECURITY,
      options: { access: 'internal' },
      validate: { params: secretNameParamsSchema, body: updateSecretBodySchema },
    },
    withAvailabilityCheck(async (_context, request, response) => {
      try {
        const client = await getSecretsClient(request);
        const { name } = request.params;
        return response.ok({ body: await client.update({ name, ...request.body }) });
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

  router.post(
    {
      path: WORKFLOW_SECRET_TEST_ROUTE,
      security: SECRETS_MANAGE_SECURITY,
      options: { access: 'internal' },
      validate: { params: secretNameParamsSchema },
    },
    withAvailabilityCheck(async (_context, request, response) => {
      try {
        const client = await getSecretsClient(request);
        return response.ok({ body: await client.test(request.params) });
      } catch (error) {
        return handleSecretsRouteError({ response, error });
      }
    })
  );

  router.get(
    {
      path: WORKFLOW_SECRET_CONNECTORS_ROUTE,
      security: SECRETS_MANAGE_SECURITY,
      options: { access: 'internal' },
      validate: false,
    },
    withAvailabilityCheck(async (_context, request, response) => {
      try {
        const client = await getSecretsClient(request);
        const body: SecretConnectorsResponse = { connectors: await client.listSecretConnectors() };
        return response.ok({ body });
      } catch (error) {
        return handleSecretsRouteError({ response, error });
      }
    })
  );

  router.get(
    {
      path: WORKFLOW_SECRETS_USAGE_ROUTE,
      security: SECRETS_USAGE_SECURITY,
      options: { access: 'internal' },
      validate: false,
    },
    withAvailabilityCheck(async (_context, request, response) => {
      try {
        return response.ok({ body: await getSecretUsageCounts(request) });
      } catch (error) {
        return handleSecretsRouteError({ response, error });
      }
    })
  );

  router.get(
    {
      path: WORKFLOW_SECRET_USAGE_ROUTE,
      security: SECRETS_USAGE_SECURITY,
      options: { access: 'internal' },
      validate: { params: secretNameParamsSchema },
    },
    withAvailabilityCheck(async (_context, request, response) => {
      try {
        return response.ok({ body: await getSecretUsage(request, request.params.name) });
      } catch (error) {
        return handleSecretsRouteError({ response, error });
      }
    })
  );
};
