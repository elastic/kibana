/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import { SamplingConfigService } from './sampling_service';

const samplingService = new SamplingConfigService();

/**
 * Configure (enable/update) sampling for streams
 * PUT /internal/streams/sampling/configure
 */
export const configureSamplingRoute = createServerRoute({
  endpoint: 'PUT /internal/streams/sampling/configure',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z
      .object({
        condition: z.string().optional(),
      })
      .optional()
      .default({}),
  }),
  handler: async ({ params, request, getScopedClients }) => {
    const { scopedClusterClient } = await getScopedClients({ request });

    return samplingService.enableSampling(scopedClusterClient, {
      condition: params.body?.condition,
    });
  },
});

/**
 * Get current sampling configuration status
 * GET /internal/streams/sampling/status
 */
export const getSamplingStatusRoute = createServerRoute({
  endpoint: 'GET /internal/streams/sampling/status',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({}),
  handler: async ({ request, getScopedClients }) => {
    const { scopedClusterClient } = await getScopedClients({ request });

    const status = await samplingService.getSamplingStatus(scopedClusterClient);

    // Return default state if no configuration exists
    if (!status) {
      return {
        enabled: false,
        condition: undefined,
        updated_at: new Date().toISOString(),
        sample_rate: 1,
      };
    }

    return status;
  },
});

/**
 * Disable sampling for streams
 * DELETE /internal/streams/sampling/configure
 */
export const disableSamplingRoute = createServerRoute({
  endpoint: 'DELETE /internal/streams/sampling/configure',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({}),
  handler: async ({ request, getScopedClients }) => {
    const { scopedClusterClient } = await getScopedClients({ request });

    return samplingService.disableSampling(scopedClusterClient);
  },
});

/**
 * Export all sampling routes
 */
export const internalSamplingRoutes = {
  ...configureSamplingRoute,
  ...getSamplingStatusRoute,
  ...disableSamplingRoute,
};
