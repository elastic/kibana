/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { verdictEnum, verdictSchema, type Verdict } from '@kbn/streams-schema';
import { z } from '@kbn/zod/v4';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';

const verdictSortEnum = z.enum(['@timestamp:asc', '@timestamp:desc']);

const verdictsSearchBody = z.object({
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  verdict: z.array(verdictEnum).optional(),
  discovery_id: z.array(z.string()).optional(),
  prioritize_slug: z.array(z.string()).optional(),
  size: z.number().int().positive().optional(),
  sort: z.array(verdictSortEnum).optional(),
});

const verdictsSearchRoute = createServerRoute({
  endpoint: 'POST /internal/sig_events/verdicts/_search',
  options: {
    access: 'internal',
    summary: 'Get latest verdicts',
    description: 'Search verdict entities using their latest derived state.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    body: verdictsSearchBody,
  }),
  handler: async ({ params, request, getScopedClients, server }): Promise<{ hits: Verdict[] }> => {
    const { getVerdictClient, licensing, uiSettingsClient } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    return getVerdictClient().findLatest(params.body);
  },
});

const verdictsLatestPerSlugRoute = createServerRoute({
  endpoint: 'POST /internal/sig_events/verdicts/_latest_per_slug',
  options: {
    access: 'internal',
    summary: 'Get latest verdict per slug',
    description:
      'Search verdict entities returning the latest derived state per discovery_slug (instead of per verdict_id).',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    body: verdictsSearchBody,
  }),
  handler: async ({ params, request, getScopedClients, server }): Promise<{ hits: Verdict[] }> => {
    const { getVerdictClient, licensing, uiSettingsClient } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    return getVerdictClient().findLatestPerSlug(params.body);
  },
});

const verdictsReviewedSummaryRoute = createServerRoute({
  endpoint: 'POST /internal/sig_events/verdicts/_reviewed_summary',
  options: {
    access: 'internal',
    summary: 'Get reviewed discovery summary',
    description:
      'Return the distinct discovery_ids and discovery_slugs that have at least one verdict in the time window.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    body: z.object({
      from: z.iso.datetime().optional(),
      to: z.iso.datetime().optional(),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<{ reviewed_discovery_ids: string[]; reviewed_slugs: string[] }> => {
    const { getVerdictClient, licensing, uiSettingsClient } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    return getVerdictClient().getReviewedSummary(params.body);
  },
});

const verdictsBulkCreateRoute = createServerRoute({
  endpoint: 'POST /internal/sig_events/verdicts',
  options: {
    access: 'internal',
    summary: 'Bulk create verdicts',
    description: 'Create verdict entities in bulk.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.array(verdictSchema),
  }),
  handler: async ({ params, request, getScopedClients, server }) => {
    const { getVerdictClient, licensing, uiSettingsClient } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    return getVerdictClient().bulkCreate(params.body);
  },
});

export const internalSigEventsVerdictsRoutes = {
  ...verdictsSearchRoute,
  ...verdictsLatestPerSlugRoute,
  ...verdictsReviewedSummaryRoute,
  ...verdictsBulkCreateRoute,
};
