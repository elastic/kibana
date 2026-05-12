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

const stringArrayFromQuery = z
  .union([z.string().transform((value) => [value]), z.array(z.string())])
  .optional();

const detectionSortEnum = z.enum(['@timestamp:asc', '@timestamp:desc']);
const detectionSortFromQuery = z
  .union([detectionSortEnum.transform((value) => [value]), z.array(detectionSortEnum)])
  .optional();

const detectionsSearchQuery = z.object({
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  rule_uuid: stringArrayFromQuery,
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
  size: z.coerce.number().int().positive().optional(),
  sort: detectionSortFromQuery,
});

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
    query: detectionsSearchQuery,
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

const detectionsLatestPerRuleRoute = createServerRoute({
  endpoint: 'GET /internal/sig_events/detections/_latest_per_rule',
  options: {
    access: 'internal',
    summary: 'Get latest detection per rule_uuid',
    description:
      'Search detection entities returning the latest derived state per rule_uuid (instead of per detection_id).',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    query: detectionsSearchQuery,
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<{ hits: Detection[] }> => {
    const { getDetectionClient, licensing, uiSettingsClient } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    return getDetectionClient().findLatestPerRule(params.query);
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
  ...detectionsLatestPerRuleRoute,
  ...detectionsBulkCreateRoute,
};
