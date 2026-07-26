/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetAuthzRouter } from '../../services/security';

import { API_VERSIONS } from '../../../common/constants';

import { CREATE_MANAGED_OTLP_API_KEY_ROUTE } from '../../constants';
import { FLEET_API_PRIVILEGES } from '../../constants/api_privileges';
import { PostManagedOtlpAPIKeyRequestSchema } from '../../types';

import { createManagedOtlpApiKeyHandler } from './handler';

export const registerRoutes = (router: FleetAuthzRouter) => {
  router.versioned
    .post({
      path: CREATE_MANAGED_OTLP_API_KEY_ROUTE,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.AGENTS.ALL],
        },
      },
      summary: 'Create a managed OTLP service API key',
      description:
        'Create an Elasticsearch API key scoped for the Elastic managed OTLP endpoint. The key carries the APM `event:write` application privilege so data can be ingested through the managed OTLP service.',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: PostManagedOtlpAPIKeyRequestSchema,
        },
      },
      createManagedOtlpApiKeyHandler
    );
};
