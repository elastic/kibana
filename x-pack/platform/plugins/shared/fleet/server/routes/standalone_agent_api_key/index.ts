/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetAuthzRouter } from '../../services/security';

import { API_VERSIONS } from '../../../common/constants';

import { CREATE_STANDALONE_AGENT_API_KEY_ROUTE } from '../../constants';
import { FLEET_API_PRIVILEGES } from '../../constants/api_privileges';
import { PostStandaloneAgentAPIKeyRequestSchema } from '../../types';

import { createStandaloneAgentApiKeyHandler } from './handler';

export const registerRoutes = (router: FleetAuthzRouter) => {
  router.versioned
    .post({
      path: CREATE_STANDALONE_AGENT_API_KEY_ROUTE,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.AGENTS.ALL],
        },
      },
      summary: 'Create a standalone agent API key',
      description:
        'Create an Elasticsearch API key for use by a standalone Elastic Agent. The key is scoped with the minimum privileges required to ship logs, metrics, traces, and synthetics data. Requires `auto_configure` and `create_doc` index privileges on `logs-*-*`, `metrics-*-*`, `traces-*-*`, and `synthetics-*-*`.',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: PostStandaloneAgentAPIKeyRequestSchema,
        },
      },
      createStandaloneAgentApiKeyHandler
    );
};
