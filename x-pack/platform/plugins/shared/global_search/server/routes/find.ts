/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { reduce, map } from 'rxjs';
import { schema } from '@kbn/config-schema';
import type { GlobalSearchRouter } from '../types';
import { GlobalSearchFindError } from '../../common/errors';

export const registerInternalFindRoute = (router: GlobalSearchRouter) => {
  router.post(
    {
      path: '/internal/global_search/find',
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
      validate: {
        body: schema.object({
          params: schema.object({
            // maxLength: matches client-side `input_max_limit` config default (1000)
            // see x-pack/platform/plugins/private/global_search_bar/server/config.ts
            term: schema.maybe(schema.string({ maxLength: 1000 })),
            // maxLength: longest type is 'cloud-security-posture-settings' (31 chars), 128 adds buffer
            types: schema.maybe(
              schema.arrayOf(schema.string({ maxLength: 128 }), { maxSize: 100 })
            ),
            // maxLength: tags are saved object UUIDs (36 chars), 128 adds buffer for non-standard IDs
            tags: schema.maybe(schema.arrayOf(schema.string({ maxLength: 128 }), { maxSize: 100 })),
          }),
          options: schema.maybe(
            schema.object({
              preference: schema.maybe(schema.string({ maxLength: 64 })),
            })
          ),
        }),
      },
    },
    async (ctx, req, res) => {
      const { params, options } = req.body;
      try {
        const globalSearch = await ctx.globalSearch;
        const { client } = (await ctx.core).elasticsearch;
        const allResults = await globalSearch
          .find(params, { ...options, aborted$: req.events.aborted$, client })
          .pipe(
            map((batch) => batch.results),
            reduce((acc, results) => [...acc, ...results])
          )
          .toPromise();
        return res.ok({
          body: {
            results: allResults,
          },
        });
      } catch (e) {
        if (e instanceof GlobalSearchFindError && e.type === 'invalid-license') {
          return res.forbidden({ body: e.message });
        }
        throw e;
      }
    }
  );
};
