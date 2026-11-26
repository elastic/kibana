/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSecretBodySchema, toSecretsErrorResponse } from '@kbn/secrets-plugin/server';
import { SECRETS_PATH, type SecretsRouteDependencies } from './types';
import { INTERNAL_API_VERSION } from '../utils/route_constants';
import { SECRETS_MANAGE_SECURITY } from '../utils/route_security';
import { withAvailabilityCheck } from '../utils/with_availability_check';

export const registerCreateSecretRoute = ({
  router,
  getSecretsClient,
}: SecretsRouteDependencies) => {
  router.versioned
    .post({
      path: SECRETS_PATH,
      access: 'internal',
      security: SECRETS_MANAGE_SECURITY,
      summary: 'Create a secret',
      description: 'Stores a secret in the space. The response does not include the value.',
    })
    .addVersion(
      { version: INTERNAL_API_VERSION, validate: { request: { body: createSecretBodySchema } } },
      withAvailabilityCheck(
        async (_context, request, response) => {
          try {
            const client = await getSecretsClient(request);
            return response.created({ body: await client.create(request.body) });
          } catch (error) {
            return toSecretsErrorResponse({ response, error });
          }
        },
        { bootstrapExecutionDataViews: false }
      )
    );
};
