/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IAC_PROVIDER_API_ROUTES, API_VERSIONS } from '../../../common/constants';
import type { FleetAuthzRouter } from '../../services/security';
import { FLEET_API_PRIVILEGES } from '../../constants/api_privileges';

import { genericErrorResponse } from '../schema/errors';
import {
  RenderIacTemplateRequestSchema,
  RenderIacTemplateResponseSchema,
} from '../../types/rest_spec/iac_provider';

import { renderIacTemplateHandler } from './handlers';

export const registerRoutes = (router: FleetAuthzRouter) => {
  router.versioned
    .post({
      path: IAC_PROVIDER_API_ROUTES.RENDER_TEMPLATE_PATTERN,
      summary: 'Render an IaC template',
      description:
        'Render a deployable IaC template for the enabled integrations via the IaC Provider.',
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: [
            {
              anyRequired: [
                FLEET_API_PRIVILEGES.AGENT_POLICIES.ALL,
                FLEET_API_PRIVILEGES.INTEGRATIONS.ALL,
              ],
            },
          ],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: RenderIacTemplateRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => RenderIacTemplateResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      renderIacTemplateHandler
    );
};
