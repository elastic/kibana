/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { get, uniq } from 'lodash';
import { first } from 'rxjs/operators';
import { KibanaRequest } from 'src/core/server';
import { SearchResponse, AggregationSearchResponse } from 'elasticsearch';
import {
  IndexPatternsService,
  FieldDescriptor,
} from '../../../../../../src/legacy/server/index_patterns/service';
import { LensCoreSetup } from '..';

type Document = Record<string, unknown>;

interface RequestParams {
  indexPatternTitle: string;
}

interface LensFieldExistenceBodyParams {
  earliest: string;
  latest: string;
  timeFieldName: string;
  size: number;
  fields: Array<{
    name: string;
    type: string;
  }>;
}

interface LensFieldStatsBodyParams {
  query: object;
  earliest: string;
  latest: string;
  timeFieldName: string;
  field: {
    name: string;
    type: string;
  };
}

export async function initStatsRoute(setup: LensCoreSetup) {
  setup.http.route({
    path: '/api/lens/index_stats/{indexPatternTitle}',
    method: 'POST',
    // TODO: This validation is defined in the new style but is not connected
    // @ts-ignore
    // validate: {
    //   body: schema.object({
    //     earliest: schema.string(),
    //     latest: schema.string(),
    //     timeFieldName: schema.string(),
    //     size: schema.number(),
    //     fields: schema.arrayOf(
    //       schema.object({
    //         name: schema.string(),
    //         type: schema.string(),
    //       })
    //     ),
    //   }),
    // },
    async handler(req: KibanaRequest<RequestParams, unknown, LensFieldExistenceBodyParams>) {
      const client = await setup.elasticsearch.dataClient$.pipe(first()).toPromise();
      const requestClient = client.asScoped(req);

      const indexPatternsService = new IndexPatternsService(requestClient.callAsCurrentUser);

      // TODO: Use validate schema to guarantee payload
      // @ts-ignore
      const bodyRef = req.payload as LensFieldExistenceBodyParams;
      const { earliest, latest, timeFieldName, fields, size } = bodyRef;

      try {
        const indexPattern = await indexPatternsService.getFieldsForWildcard({
          pattern: req.params.indexPatternTitle,
          // TODO: Pull this from kibana advanced settings
          metaFields: ['_source', '_id', '_type', '_index', '_score'],
        });

        const results: SearchResponse<Document> = await requestClient.callAsCurrentUser('search', {
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
                      },
                    },
                  },
                ],
              },
            },
            size,
          },
        });

        if (results.hits.hits.length) {
          return recursiveFlatten(results.hits.hits, indexPattern, fields);
        }
        return {};
      } catch (e) {
        setup.http.server.log(['lens', 'info'], JSON.stringify(e));
        if (e.isBoom) {
          return e;
        } else {
          return Boom.internal(e.message || e.name);
        }
      }
    },
  });

  setup.http.route({
    path: '/api/lens/index_stats/{indexPatternTitle}/field',
    method: 'POST',
    // TODO: This validation is defined in the new style but is not connected
    // @ts-ignore
    // validate: {
    //   body: schema.object({
    //     query: schema.object({}),
    //     earliest: schema.string(),
    //     latest: schema.string(),
    //     timeFieldName: schema.string(),
    //     fields: schema.arrayOf(
    //       schema.object({
    //         name: schema.string(),
    //         type: schema.string(),
    //       })
    //     ),
    //   }),
    // },
    async handler(req: KibanaRequest<RequestParams, unknown, LensFieldStatsBodyParams>) {
      const client = await setup.elasticsearch.dataClient$.pipe(first()).toPromise();
      const requestClient = client.asScoped(req);

      // TODO: Use validate schema to guarantee payload
      const bodyRef = req.payload as LensFieldExistenceBodyParams;
      const { earliest, latest, timeFieldName, field } = bodyRef;

      try {
        const filters = {
          bool: {
            filter: [
              {
                range: {
                  [timeFieldName]: {
                    gte: earliest,
                    lte: latest,
                  },
                },
              },
            ],
          },
        };

        setup.http.server.log(['lens', 'info'], {
          index: req.params.indexPatternTitle,
          body: {
            query: filters,
            aggs: {
              min_value: {
                min: { field: field.name },
              },
              max_value: {
                max: { field: field.name },
              },
            },
            size: 0,
          },
        });

        const minMaxResult: AggregationSearchResponse<
          unknown,
          {
            aggs: {
              sample: {
                sampler: { shard_size: 5000 };
                aggs: {
                  min_value: {
                    min: { field: string };
                  };
                  max_value: {
                    max: { field: string };
                  };
                };
              };
            };
          }
        > = await requestClient.callAsCurrentUser('search', {
          index: req.params.indexPatternTitle,
          body: {
            query: filters,
            aggs: {
              sample: {
                sampler: { shard_size: 5000 },
                aggs: {
                  min_value: {
                    min: { field: field.name },
                  },
                  max_value: {
                    max: { field: field.name },
                  },
                },
              },
            },
            size: 0,
          },
        });
        setup.http.server.log(['lens', 'info'], JSON.stringify(minMaxResult));

        const minValue = minMaxResult.aggregations.sample.min_value.value;
        const maxValue = minMaxResult.aggregations.sample.max_value.value;

        const histogramInterval = (maxValue - minValue) / 10;

        const histogramResult: AggregationSearchResponse<
          unknown,
          {}
        > = await requestClient.callAsCurrentUser('search', {
          index: req.params.indexPatternTitle,
          body: {
            query: filters,
            aggs: {
              sample: {
                sampler: { shard_size: 5000 },
                aggs: {
                  histo: {
                    histogram: {
                      field: field.name,
                      interval: histogramInterval,
                    },
                  },
                },
              },
            },
            size: 0,
          },
        });
        setup.http.server.log(['lens', 'info'], JSON.stringify(histogramResult));

        return histogramResult.aggregations.sample.histo;
      } catch (e) {
        setup.http.server.log(['lens', 'info'], JSON.stringify(e));
        if (e.isBoom) {
          return e;
        } else {
          return Boom.internal(e.message || e.name);
        }
      }
    },
  });
}

export function recursiveFlatten(
  docs: Array<{
    _source: Document;
  }>,
  indexPattern: FieldDescriptor[],
  fields: LensFieldExistenceBodyParams['fields']
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
