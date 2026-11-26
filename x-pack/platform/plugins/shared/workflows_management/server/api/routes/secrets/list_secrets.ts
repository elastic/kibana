/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toSecretsErrorResponse } from '@kbn/secrets-plugin/server';
import { SECRETS_PATH, type SecretsRouteDependencies } from './types';
import { INTERNAL_API_VERSION } from '../utils/route_constants';
import { SECRETS_LIST_SECURITY } from '../utils/route_security';
import { withAvailabilityCheck } from '../utils/with_availability_check';

export const registerListSecretsRoute = ({
  router,
  getSecretsClient,
}: SecretsRouteDependencies) => {
  router.versioned
    .get({
      path: SECRETS_PATH,
      access: 'internal',
      security: SECRETS_LIST_SECURITY,
      summary: 'List the secrets of the space',
      description: 'Returns the name and description of each secret, never its value.',
    })
    .addVersion(
      { version: INTERNAL_API_VERSION, validate: false },
      withAvailabilityCheck(
        async (_context, request, response) => {
          try {
            const client = await getSecretsClient(request);
            return response.ok({ body: { secrets: await client.list() } });
          } catch (error) {
            return toSecretsErrorResponse({ response, error });
          }
        },
        { bootstrapExecutionDataViews: false }
      )
    );
};
