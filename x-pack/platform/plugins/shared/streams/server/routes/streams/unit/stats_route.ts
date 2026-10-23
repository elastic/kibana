/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { notImplemented } from '@hapi/boom';
import type { StreamsUnit } from '@kbn/streams-schema';
import { streamsUnitIdentifierSchema, streamsUnitStatsRequestSchema } from '@kbn/streams-schema';
import { z } from '@kbn/zod/v4';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
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
  params: z.object({
    path: z.object({
      id: streamsUnitIdentifierSchema.describe('The unit id.'),
    }),
    body: streamsUnitStatsRequestSchema,
  }),
  handler: async ({ request, getScopedClients }): Promise<StreamsUnit.StatsResponse> => {
    const { uiSettingsClient } = await getScopedClients({ request });

    await assertStreamsCanvasEnabled(uiSettingsClient);

    throw notImplemented('Streams unit stats are not implemented yet.');
  },
});

export const unitStatsRoutes = {
  ...getStreamsUnitStatsRoute,
};
