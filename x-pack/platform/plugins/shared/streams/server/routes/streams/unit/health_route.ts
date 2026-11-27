/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { streamsUnitIdentifierSchema, type StreamsUnit } from '@kbn/streams-schema';
import { lazySchema, z } from '@kbn/zod/v4';
import { STREAMS_V2_API_PRIVILEGES } from '../../../../common/constants';
import { StreamsUnitService } from '../../../lib/saved_objects/streams_unit_service';
import { createServerRoute } from '../../create_server_route';
import { assertStreamsCanvasEnabled } from './assert_streams_canvas_enabled';

export const getStreamsUnitHealthRoute = createServerRoute({
  endpoint: 'GET /internal/streams/unit/{id}/_health',
  options: {
    access: 'internal',
    summary: 'Get the health of a Streams unit',
    description: 'Returns whether the unit is up, from the heartbeat its collector reports.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_V2_API_PRIVILEGES.read],
    },
  },
  params: lazySchema(() =>
    z.object({
      path: z.object({
        id: streamsUnitIdentifierSchema.describe('The unit id.'),
      }),
    })
  ),
  handler: async ({
    params,
    request,
    getScopedClients,
    logger,
  }): Promise<StreamsUnit.HealthResponse> => {
    const { unitSoClient, uiSettingsClient, unitStatsClient } = await getScopedClients({
      request,
    });

    await assertStreamsCanvasEnabled(uiSettingsClient);

    // A unit that was never saved is a 404, and has no health to report.
    await new StreamsUnitService({ soClient: unitSoClient, logger }).getUnit(params.path.id);

    return { liveness: await unitStatsClient.getUnitLiveness({ unitId: params.path.id }) };
  },
});

export const unitHealthRoutes = {
  ...getStreamsUnitHealthRoute,
};
