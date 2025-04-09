/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetAuthzRouter } from '../../services/security';

import { API_VERSIONS } from '../../../common/constants';
import { EPM_API_ROUTES } from '../../../common/constants';
import { FLEET_API_PRIVILEGES } from '../../constants/api_privileges';
import { genericErrorResponse } from '../schema/errors';
import { CustomIntegrationRequestSchema } from '../../types/models/custom_integrations';

import { updateCustomIntegrationHandler } from './handlers';

export const registerRoutes = (router: FleetAuthzRouter) => {
  router.versioned
    .put({
      path: EPM_API_ROUTES.UPDATE_CUSTOM_INTEGRATIONS_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [
            FLEET_API_PRIVILEGES.SETTINGS.READ,
            FLEET_API_PRIVILEGES.INTEGRATIONS.READ,
          ],
        },
      },
      summary: `Updates a custom integration`,
      options: {
        tags: ['oas-tag:Custom Integrations'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: CustomIntegrationRequestSchema,
          response: {
            200: {},
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      updateCustomIntegrationHandler
    );
};
