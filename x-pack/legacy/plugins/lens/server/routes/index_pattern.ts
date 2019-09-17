/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { schema } from '@kbn/config-schema';
import { IRouter } from 'src/core/server';
import { LensServerOptions } from '../server_options';
import { fetchIndexPatternWithEmptinessData } from '../data';

/**
 * API for fetching an index pattern along with its fields and an indication
 * of which field(s) are empty for the given time range.
 */
export async function indexPatternsRoute(opts: LensServerOptions, router: IRouter) {
  router.get(
    {
      path: '/index_patterns/{id}',
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        query: schema.object({
          fromDate: schema.maybe(schema.string()),
          toDate: schema.maybe(schema.string()),
          timeZone: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, req, res) => {
      const savedObjectsClient = opts.getScopedSavedObjectsClient(req);
      const { fromDate, toDate, timeZone } = req.query;

      try {
        const indexPattern = await fetchIndexPatternWithEmptinessData({
          savedObjectsClient,
          fromDate,
          toDate,
          timeZone,
          indexPatternId: req.params.id,
          client: context.core.elasticsearch.dataClient,
        });

        return res.ok({ body: indexPattern });
      } catch (e) {
        if (e.isBoom) {
          return res.internalError(e);
        } else {
          return res.internalError({
            body: Boom.internal(e.message || e.name),
          });
        }
      }
    }
  );
}
