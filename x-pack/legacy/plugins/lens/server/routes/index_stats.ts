/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { get } from 'lodash';
import { schema } from '@kbn/config-schema';
import { SearchResponse } from 'elasticsearch';
import { IRouter } from 'src/core/server';
import {
  IndexPatternsService,
  FieldDescriptor,
} from '../../../../../../src/legacy/server/index_patterns/service';

type Document = Record<string, unknown>;

type Fields = Array<{ name: string; type: string; esTypes?: string[] }>;

export async function initStatsRoute(router: IRouter) {
  router.post(
    {
      path: '/index_stats/{indexPatternTitle}',
      validate: {
        params: schema.object({
          indexPatternTitle: schema.string(),
        }),
        body: schema.object({
          fromDate: schema.string(),
          toDate: schema.string(),
          timeZone: schema.maybe(schema.string()),
          timeFieldName: schema.string(),
          size: schema.number(),
          fields: schema.arrayOf(
            schema.object({
              name: schema.string(),
              type: schema.string(),
            })
          ),
        }),
      },
    },
    async (context, req, res) => {
      const requestClient = context.core.elasticsearch.dataClient;

      const indexPatternsService = new IndexPatternsService(requestClient.callAsCurrentUser);

      const { fromDate, toDate, timeZone, timeFieldName, fields, size } = req.body;

      try {
        const indexPattern = await indexPatternsService.getFieldsForWildcard({
          pattern: req.params.indexPatternTitle,
          // TODO: Pull this from kibana advanced settings
          metaFields: ['_source', '_id', '_type', '_index', '_score'],
        });

        const results = (await requestClient.callAsCurrentUser('search', {
          index: req.params.indexPatternTitle,
          body: {
            query: {
              bool: {
                filter: [
                  {
                    range: {
                      [timeFieldName]: {
                        gte: fromDate,
                        lte: toDate,
                        time_zone: timeZone,
                      },
                    },
                  },
                ],
              },
            },
            size,
          },
        })) as SearchResponse<Document>;

        if (results.hits.hits.length) {
          return res.ok({
            body: recursiveFlatten(results.hits.hits, indexPattern, fields),
          });
        }
        return res.ok({ body: {} });
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

export function recursiveFlatten(
  docs: Array<{
    _source: Document;
  }>,
  indexPattern: FieldDescriptor[],
  fields: Fields
): Record<
  string,
  {
    count: number;
    cardinality: number;
  }
> {
  const overallKeys: Record<
    string,
    {
      count: number;
      samples: Set<unknown>;
    }
  > = {};

  const expectedKeys = new Set(fields.map(f => f.name));

  indexPattern.forEach(field => {
    if (!expectedKeys.has(field.name)) {
      return;
    }

    docs.forEach(doc => {
      if (!doc) {
        return;
      }

      const match = get(doc._source, field.parent || field.name);
      if (typeof match === 'undefined') {
        return;
      }

      const record = overallKeys[field.name];
      if (record) {
        record.count += 1;
        record.samples.add(match);
      } else {
        overallKeys[field.name] = {
          count: 1,
          // Using a set here makes the most sense and avoids the later uniq computation
          samples: new Set([match]),
        };
      }
    });
  });

  const returnTypes: Record<
    string,
    {
      count: number;
      cardinality: number;
    }
  > = {};
  Object.entries(overallKeys).forEach(([key, value]) => {
    returnTypes[key] = {
      count: value.count,
      cardinality: value.samples.size,
    };
  });
  return returnTypes;
}
