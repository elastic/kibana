/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import { streamsUnitIdentifierSchema, streamsUnitStatsRequestSchema } from '@kbn/streams-schema';
import { z, lazySchema } from '@kbn/zod/v4';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { StreamsUnitService } from '../../../lib/saved_objects/streams_unit_service';
import { createServerRoute } from '../../create_server_route';
import { assertStreamsCanvasEnabled } from './assert_streams_canvas_enabled';

export const getStreamsUnitStatsRoute = createServerRoute({
  endpoint: 'POST /internal/streams/unit/{id}/_stats',
  options: {
    access: 'internal',
    summary: 'Get stats for components of a Streams unit',
    description:
      'Returns stats for the components of a unit, keyed by kind and id. A null value means no data.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: lazySchema(() => z.object({
    path: z.object({
      id: streamsUnitIdentifierSchema.describe('The unit id.'),
    }),
    body: streamsUnitStatsRequestSchema.optional(),
  })),
  handler: async ({
    params,
    request,
    getScopedClients,
    logger,
  }): Promise<StreamsUnit.StatsResponse> => {
    const { soClient, uiSettingsClient, unitStatsClient } = await getScopedClients({
      request,
    });

    await assertStreamsCanvasEnabled(uiSettingsClient);

    const { unit } = await new StreamsUnitService({ soClient, logger }).getUnit(params.path.id);

    return unitStatsClient.getStats({
      unitId: params.path.id,
      unit,
      // No body, or an empty `{}` body that the route repository drops, is the empty request.
      request: params.body ?? {},
    });
  },
});

export const unitStatsRoutes = {
  ...getStreamsUnitStatsRoute,
};
