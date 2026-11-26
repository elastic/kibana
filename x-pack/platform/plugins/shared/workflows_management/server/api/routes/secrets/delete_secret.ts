/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { secretNameParamsSchema, toSecretsErrorResponse } from '@kbn/secrets-plugin/server';
import { SECRET_PATH, type SecretsRouteDependencies } from './types';
import { INTERNAL_API_VERSION } from '../utils/route_constants';
import { SECRETS_MANAGE_SECURITY } from '../utils/route_security';
import { withAvailabilityCheck } from '../utils/with_availability_check';

export const registerDeleteSecretRoute = ({
  router,
  getSecretsClient,
}: SecretsRouteDependencies) => {
  router.versioned
    .delete({
      path: SECRET_PATH,
      access: 'internal',
      security: SECRETS_MANAGE_SECURITY,
      summary: 'Delete a secret',
    })
    .addVersion(
      { version: INTERNAL_API_VERSION, validate: { request: { params: secretNameParamsSchema } } },
      withAvailabilityCheck(
        async (_context, request, response) => {
          try {
            const client = await getSecretsClient(request);
            await client.delete(request.params);
            return response.noContent();
          } catch (error) {
            return toSecretsErrorResponse({ response, error });
          }
        },
        { bootstrapExecutionDataViews: false }
      )
    );
};
