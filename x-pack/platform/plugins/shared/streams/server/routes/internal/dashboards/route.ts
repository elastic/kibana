/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { STREAMS_API_PRIVILEGES } from '../../../../common/constants';
import { createServerRoute } from '../../create_server_route';
import type { Attachment } from '../../../lib/streams/attachments/types';

export interface SuggestDashboardResponse {
  suggestions: Attachment[];
}

const suggestDashboardsRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/dashboards/_suggestions',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({
      name: z.string(),
    }),
    query: z.object({
      query: z.string(),
    }),
    body: z.object({
      tags: z.optional(z.array(z.string())),
    }),
  }),
  handler: async ({ params, request, getScopedClients }): Promise<SuggestDashboardResponse> => {
    const { streamsClient, attachmentClient } = await getScopedClients({ request });

    await streamsClient.ensureStream(params.path.name);

    const {
      query: { query },
      body: { tags },
    } = params;

    const suggestions = (
      await attachmentClient.getSuggestions({
        attachmentTypes: ['dashboard'],
        query,
        tags,
      })
    ).attachments;

    return {
      suggestions,
    };
  },
});

export const internalDashboardRoutes = {
  ...suggestDashboardsRoute,
};
