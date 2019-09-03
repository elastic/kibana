/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { get } from 'lodash';
import DateMath from '@elastic/datemath';
import { schema } from '@kbn/config-schema';
import { SearchResponse, AggregationSearchResponse } from 'elasticsearch';
import { CoreSetup } from 'src/core/server';
import {
  IndexPatternsService,
  FieldDescriptor,
} from '../../../../../../src/legacy/server/index_patterns/service';

type Document = Record<string, unknown>;

type Fields = Array<{ name: string; type: string; esTypes?: string[] }>;

export async function initStatsRoute(setup: CoreSetup) {
  const router = setup.http.createRouter();
  router.post(
    {
      path: '/index_stats/{indexPatternTitle}',
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

  router.post(
    {
      path: '/index_stats/{indexPatternTitle}/field',
      validate: {
        params: schema.object({
          indexPatternTitle: schema.string(),
        }),
        body: schema.object(
          {
            // query: schema.object({}),
            earliest: schema.string(),
            latest: schema.string(),
            timeFieldName: schema.string(),
            field: schema.object(
              {
                name: schema.string(),
                type: schema.string(),
                esTypes: schema.maybe(schema.arrayOf(schema.string())),
              },
              { allowUnknowns: true }
            ),
          },
          { allowUnknowns: true }
        ),
      },
    },
    async (context, req, res) => {
      const requestClient = context.core.elasticsearch.dataClient;
      const { earliest, latest, timeFieldName, field } = req.body;

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

        if (field.type === 'number') {
          return res.ok({
            body: await getNumberHistogram(
              (aggBody: unknown) =>
                requestClient.callAsCurrentUser('search', {
                  index: req.params.indexPatternTitle,
                  body: {
                    query: filters,
                    aggs: aggBody,
                  },
                  size: 0,
                }),
              field
            ),
          });
        } else if (field.type === 'string') {
          return res.ok({
            body: await getStringSamples(
              (aggBody: unknown) =>
                requestClient.callAsCurrentUser('search', {
                  index: req.params.indexPatternTitle,
                  body: {
                    query: filters,
                    aggs: aggBody,
                  },
                  size: 0,
                }),
              field
            ),
          });
        } else if (field.type === 'date') {
          return res.ok({
            body: await getDateHistogram(
              (aggBody: unknown) =>
                requestClient.callAsCurrentUser('search', {
                  index: req.params.indexPatternTitle,
                  body: {
                    query: filters,
                    aggs: aggBody,
                  },
                  size: 0,
                }),
              field,
              {
                earliest,
                latest,
              }
            ),
          });
        }
        return res.ok();
      } catch (e) {
        // setup.http.server.log(['lens', 'info'], JSON.stringify(e));
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

export async function getNumberHistogram(
  aggSearchWithBody: (body: unknown) => Promise<AggregationSearchResponse<unknown>>,
  field: { name: string; type: string }
) {
  const minMaxResult: AggregationSearchResponse<
    unknown,
    {
      body: {
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
      };
    }
  > = await aggSearchWithBody({
    sample: {
      sampler: { shard_size: 5000 },
      aggs: {
        min_value: {
          min: { field: field.name },
        },
        max_value: {
          max: { field: field.name },
        },
        top_values: {
          terms: { field: field.name, size: 10 },
        },
      },
    },
  });

  const minValue = minMaxResult.aggregations.sample.min_value.value;
  const maxValue = minMaxResult.aggregations.sample.max_value.value;
  const terms = minMaxResult.aggregations.sample.top_values;

  const histogramInterval = (maxValue - minValue) / 10;

  if (histogramInterval === 0) {
    // return { buckets: [] };
    return {
      top_values: terms,
      histogram: { buckets: [], doc_count: minMaxResult.aggregations.sample.doc_count },
    };
  }

  const histogramResult: AggregationSearchResponse<
    unknown,
    {
      body: {
        aggs: {
          sample: {
            sampler: {};
            aggs: {
              histo: {
                histogram: { field: string; interval: number };
              };
            };
          };
        };
      };
    }
  > = await aggSearchWithBody({
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
  });

  return {
    histogram: histogramResult.aggregations.sample,
    top_values: terms,
  };
}

export async function getStringSamples(
  aggSearchWithBody: (body: unknown) => Promise<AggregationSearchResponse<unknown>>,
  field: { name: string; type: string }
) {
  const topValuesResult: AggregationSearchResponse<
    unknown,
    {
      aggregations: {
        sample: {
          sampler: { shard_size: 5000 };
          aggs: {
            top_values: {
              terms: { field: string };
            };
          };
        };
      };
    }
  > = await aggSearchWithBody({
    sample: {
      sampler: { shard_size: 5000 },
      aggs: {
        top_values: {
          terms: { field: field.name, size: 10 },
        },
      },
    },
  });

  return topValuesResult.aggregations.sample;
}

// This one is not sampled so that it returns the full date range
export async function getDateHistogram(
  aggSearchWithBody: (body: unknown) => Promise<AggregationSearchResponse<unknown>>,
  field: { name: string; type: string },
  range: { earliest: string; latest: string }
) {
  const earliest = DateMath.parse(range.earliest);
  const latest = DateMath.parse(range.latest);
  if (!earliest) {
    throw Error('Invalid earliest value');
  }
  if (!latest) {
    throw Error('Invalid latest value');
  }

  // TODO: Respect rollup intervals
  const fixedInterval = `${Math.round((latest.valueOf() - earliest.valueOf()) / 10)}ms`;

  const results: AggregationSearchResponse<
    unknown,
    {
      body: {
        aggs: {
          histo: {
            date_histogram: { field: string };
          };
        };
      };
    }
  > = await aggSearchWithBody({
    histo: {
      date_histogram: { field: field.name, fixed_interval: fixedInterval, min_doc_count: 1 },
    },
  });

  return {
    histogram: results.aggregations,
  };
}
