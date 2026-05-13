/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_VERSIONS } from '../../../common/constants';
import {
  GetOtelCollectorsRequestSchema,
  GetOtelCollectorsResponseSchema,
} from '../../../common/types/rest_spec/otel_collector';
import { parseExperimentalConfigValue } from '../../../common/experimental_features';
import type { FleetAuthzRouter } from '../../services/security';
import type { FleetConfigType } from '../../config';
import { OTEL_COLLECTOR_API_ROUTES } from '../../constants';
import { FLEET_API_PRIVILEGES } from '../../constants/api_privileges';
import { genericErrorResponse } from '../schema/errors';

import { getOtelCollectorsHandler } from './handlers';

export const registerOtelCollectorRoutes = (router: FleetAuthzRouter, config: FleetConfigType) => {
  const experimentalFeatures = parseExperimentalConfigValue(
    config.enableExperimental || [],
    config.experimentalFeatures || {}
  );
  if (!experimentalFeatures.enableOtelUI) {
    return;
  }

  router.versioned
    .get({
      path: OTEL_COLLECTOR_API_ROUTES.LIST_PATTERN,
      security: {
        authz: {
          requiredPrivileges: [FLEET_API_PRIVILEGES.AGENTS.READ],
        },
      },
      summary: 'List OTel collectors',
      description: '[Technical preview] List Fleet-enrolled OTel collectors (OPAMP agents).',
      options: {
        tags: ['oas-tag:Elastic Agents'],
        availability: { stability: 'experimental' as const },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetOtelCollectorsRequestSchema,
          response: {
            200: {
              description: 'OK',
              body: () => GetOtelCollectorsResponseSchema,
            },
            400: {
              body: genericErrorResponse,
              description: 'A bad request.',
            },
          },
        },
      },
      getOtelCollectorsHandler
    );
};
