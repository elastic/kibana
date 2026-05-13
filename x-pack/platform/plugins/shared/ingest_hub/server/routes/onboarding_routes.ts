/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import type { FleetStartContract } from '@kbn/fleet-plugin/server';
import { INGEST_HUB_ONBOARDING_ENABLED_FLAG } from '../../common/constants';
import { hasFleetIntegrationPrivileges } from '../lib/has_fleet_integration_privileges';

const AUTHZ_OPT_OUT = {
  authz: {
    enabled: false as const,
    reason: 'Authorization is checked by Fleet privilege verification in the handler',
  },
};

export const registerOnboardingRoutes = (
  router: IRouter,
  logger: Logger,
  getFleetStart: () => FleetStartContract
) => {
  router.versioned
    .get({
      access: 'internal',
      path: '/internal/ingest_hub/onboarding/aws',
      security: AUTHZ_OPT_OUT,
    })
    .addVersion({ version: '1', validate: false }, async (context, request, response) => {
      const { featureFlags } = await context.core;
      const isEnabled = await featureFlags.getBooleanValue(
        INGEST_HUB_ONBOARDING_ENABLED_FLAG,
        false
      );
      if (!isEnabled) {
        return response.notFound({ body: { message: 'Onboarding is not enabled' } });
      }

      const hasPrivileges = await hasFleetIntegrationPrivileges(request, getFleetStart());
      if (!hasPrivileges) {
        return response.forbidden({
          body: { message: 'Missing required Fleet integrations privileges' },
        });
      }

      return response.ok({ body: {} });
    });
};
