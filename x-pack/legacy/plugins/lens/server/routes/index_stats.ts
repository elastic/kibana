/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { get, uniq } from 'lodash';
import { schema } from '@kbn/config-schema';
import { SearchResponse } from 'elasticsearch';
import { CoreSetup } from 'src/core/server';
import {
  IndexPatternsService,
  FieldDescriptor,
} from '../../../../../../src/legacy/server/index_patterns/service';

type Document = Record<string, unknown>;

type Fields = Array<{ name: string; type: string; esTypes?: string[] }>;

export async function initStatsRoute(setup: CoreSetup) {
  const router = setup.http.createRouter('/api/lens/index_stats/{indexPatternTitle}');
  router.post(
    {
      path: '',
      validate: {
        params: schema.object({
          indexPatternTitle: schema.string(),
        }),
        body: schema.object({
          earliest: schema.string(),
          latest: schema.string(),
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

      const { earliest, latest, timeZone, timeFieldName, fields, size } = req.body;

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
                        gte: earliest,
                        lte: latest,
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
      samples: unknown[];
    }
  > = {};

  const expectedKeys: Record<string, boolean> = {};
  fields.forEach(field => {
    expectedKeys[field.name] = true;
  });

  // TODO: Alias types
  indexPattern.forEach(field => {
    if (!expectedKeys[field.name]) {
      return;
    }

    let matches;
    if (field.parent) {
      matches = docs.map(doc => {
        if (!doc) {
          return;
        }
        return get(doc._source, field.parent!);
      });
    } else {
      matches = docs.map(doc => {
        if (!doc) {
          return;
        }
        return get(doc._source, field.name);
      });
    }

    matches.forEach(match => {
      const record = overallKeys[field.name];
      if (record) {
        record.count += 1;
        record.samples.push(match);
      } else if (match) {
        overallKeys[field.name] = {
          count: 1,
          samples: [match],
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
      cardinality: uniq(value.samples).length,
    };
  });
  return returnTypes;
}
