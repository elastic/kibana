/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IAC_PROVISIONER_API_ROUTES, API_VERSIONS } from '../../../common/constants';
import type { FleetAuthzRouter } from '../../services/security';
import { FLEET_API_PRIVILEGES } from '../../constants/api_privileges';

import { genericErrorResponse } from '../schema/errors';
import {
  RenderIacTemplateRequestSchema,
  RenderIacTemplateResponseSchema,
  ResolveIacBlueprintsRequestSchema,
  ResolveIacBlueprintsResponseSchema,
} from '../../types/rest_spec/iac_provisioner';

import { renderIacTemplateHandler, resolveIacBlueprintsHandler } from './handlers';

const IAC_PROVISIONER_ROUTE_SECURITY = {
  authz: {
    // Read + proxy only: the handler reads package info and forwards to
    // the IaC Provisioner. It never writes Fleet objects, so READ is the
    // correct level — matching the sibling GET cloud-connector routes.
    requiredPrivileges: [
      {
        anyRequired: [
          FLEET_API_PRIVILEGES.AGENT_POLICIES.READ,
          FLEET_API_PRIVILEGES.INTEGRATIONS.READ,
        ],
      },
    ],
  },
} as const;

export const registerRoutes = (router: FleetAuthzRouter) => {
  router.versioned
    .post({
      path: IAC_PROVISIONER_API_ROUTES.RENDER_TEMPLATE_PATTERN,
      summary: 'Render an IaC template',
      description:
        'Render a deployable IaC template for the enabled integrations via the IaC Provisioner.',
      access: 'internal',
      security: IAC_PROVISIONER_ROUTE_SECURITY,
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

  router.versioned
    .post({
      path: IAC_PROVISIONER_API_ROUTES.RESOLVE_BLUEPRINTS_PATTERN,
      summary: 'Resolve IaC blueprints',
      description:
        'Resolve which IaC blueprints are deployable for the enabled integrations, without storing an artifact.',
      access: 'internal',
      security: IAC_PROVISIONER_ROUTE_SECURITY,
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: ResolveIacBlueprintsRequestSchema,
          response: {
            200: {
              description: 'OK: A successful request.',
              body: () => ResolveIacBlueprintsResponseSchema,
            },
            400: {
              description: 'A bad request.',
              body: genericErrorResponse,
            },
          },
        },
      },
      resolveIacBlueprintsHandler
    );
};
