/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { detectionSchema, type Detection } from '@kbn/streams-schema';
import { BooleanFromString } from '@kbn/zod-helpers/v4';
import { z } from '@kbn/zod/v4';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';

const detectionsSearchRoute = createServerRoute({
  endpoint: 'GET /internal/sig_events/detections',
  options: {
    access: 'internal',
    summary: 'Get latest detections',
    description: 'Search detection entities using their latest derived state.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    query: z.object({
      from: z.iso.datetime().optional(),
      to: z.iso.datetime().optional(),
      rule_uuid: z
        .union([z.string().transform((value) => [value]), z.array(z.string())])
        .optional(),
      rule_name: z.string().optional(),
      stream_name: z.string().optional(),
      silent: BooleanFromString.optional(),
      superseded: BooleanFromString.optional(),
      superseded_at: z
        .object({
          from: z.iso.datetime().optional(),
          to: z.iso.datetime().optional(),
        })
        .optional(),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<{ hits: Detection[] }> => {
    const { getDetectionClient, licensing, uiSettingsClient } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    return getDetectionClient().findLatest(params.query);
  },
});

const detectionsBulkCreateRoute = createServerRoute({
  endpoint: 'POST /internal/sig_events/detections',
  options: {
    access: 'internal',
    summary: 'Bulk create detections',
    description: 'Create detection entities in bulk.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.array(detectionSchema),
  }),
  handler: async ({ params, request, getScopedClients, server }) => {
    const { getDetectionClient, licensing, uiSettingsClient } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    return getDetectionClient().bulkCreate(params.body);
  },
});

export const internalSigEventsDetectionsRoutes = {
  ...detectionsSearchRoute,
  ...detectionsBulkCreateRoute,
};
