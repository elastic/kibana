/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { schema } from '@kbn/config-schema';
import { IRouter } from 'src/core/server';
import { LensServerOptions } from '../server_options';
import { MissingFields } from '../../common';
import { fetchIndexPatternWithEmptinessData } from '../data';

/**
 * Compute the list of fields which have no data for the specified time range.
 */
export async function emptyFieldsRoute(opts: LensServerOptions, router: IRouter) {
  router.get(
    {
      path: '/empty_fields/{id}',
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

        const missingFieldNames = indexPattern.fields.filter(f => !f.exists).map(f => f.name);

        if (missingFieldNames.length === indexPattern.fields.length) {
          const allEmpty: MissingFields = { type: 'all' };
          return res.ok({ body: allEmpty });
        }

        const someEmpty: MissingFields = {
          type: 'some',
          fieldNames: missingFieldNames,
        };

        return res.ok({ body: someEmpty });
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
