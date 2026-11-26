/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  secretNameParamsSchema,
  toSecretsErrorResponse,
  updateSecretBodySchema,
} from '@kbn/secrets-plugin/server';
import { SECRET_PATH, type SecretsRouteDependencies } from './types';
import { INTERNAL_API_VERSION } from '../utils/route_constants';
import { SECRETS_MANAGE_SECURITY } from '../utils/route_security';
import { withAvailabilityCheck } from '../utils/with_availability_check';

export const registerUpdateSecretRoute = ({
  router,
  getSecretsClient,
}: SecretsRouteDependencies) => {
  router.versioned
    .patch({
      path: SECRET_PATH,
      access: 'internal',
      security: SECRETS_MANAGE_SECURITY,
      summary: 'Update a secret',
      description:
        'Replaces the value, the description, or both. The response does not include the value.',
    })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: { request: { params: secretNameParamsSchema, body: updateSecretBodySchema } },
      },
      withAvailabilityCheck(
        async (_context, request, response) => {
          try {
            const client = await getSecretsClient(request);
            const { name } = request.params;
            return response.ok({ body: await client.update({ name, ...request.body }) });
          } catch (error) {
            return toSecretsErrorResponse({ response, error });
          }
        },
        { bootstrapExecutionDataViews: false }
      )
    );
};
