/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { DashboardAsset } from '../../../../common/assets';
import { createServerRoute } from '../../create_server_route';
import { SanitizedDashboardAsset } from '../../dashboards/route';

export interface SuggestDashboardResponse {
  suggestions: SanitizedDashboardAsset[];
}

function sanitizeDashboardAsset(asset: DashboardAsset): SanitizedDashboardAsset {
  return {
    id: asset.assetId,
    label: asset.label,
    tags: asset.tags,
  };
}

const suggestDashboardsRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{name}/dashboards/_suggestions',
  options: {
    access: 'internal',
  },
  security: {
    authz: {
      enabled: false,
      reason:
        'This API delegates security to the currently logged in user and their Elasticsearch permissions.',
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
    const { assetClient, streamsClient } = await getScopedClients({ request });

    await streamsClient.ensureStream(params.path.name);

    const {
      query: { query },
      body: { tags },
    } = params;

    const suggestions = (
      await assetClient.getSuggestions({
        assetTypes: ['dashboard'],
        query,
        tags,
      })
    ).assets.map((asset) => {
      return sanitizeDashboardAsset(asset as DashboardAsset);
    });

    return {
      suggestions,
    };
  },
});

export const internalDashboardRoutes = {
  ...suggestDashboardsRoute,
};
