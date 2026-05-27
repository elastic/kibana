/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';

export interface SearchResult {
  id: string;
  title: string;
  type: 'dashboard' | 'search';
}

export const registerSearchRoute = (router: IRouter) => {
  router.get(
    {
      path: '/internal/dynamic_home/search',
      validate: {
        query: schema.object({ q: schema.string({ minLength: 1, maxLength: 200 }) }),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'Access controlled via scoped saved objects client.',
        },
      },
    },
    async (ctx, req, res) => {
      const { q } = req.query;
      const soClient = (await ctx.core).savedObjects.client;

      const [dashboards, searches] = await Promise.all([
        soClient.find<{ title: string }>({
          type: 'dashboard',
          search: q,
          searchFields: ['title'],
          perPage: 5,
          fields: ['title'],
        }),
        soClient.find<{ title: string }>({
          type: 'search',
          search: q,
          searchFields: ['title'],
          perPage: 5,
          fields: ['title'],
        }),
      ]);

      const results: SearchResult[] = [
        ...dashboards.saved_objects.map((d) => ({
          id: d.id,
          title: d.attributes.title ?? 'Untitled',
          type: 'dashboard' as const,
        })),
        ...searches.saved_objects.map((s) => ({
          id: s.id,
          title: s.attributes.title ?? 'Untitled',
          type: 'search' as const,
        })),
      ];

      return res.ok({ body: { results } });
    }
  );
};
