/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import DateMath from '@elastic/datemath';
import { schema } from '@kbn/config-schema';
import { AggregationSearchResponse } from 'elasticsearch';
import { CoreSetup } from 'src/core/server';

const SHARD_SIZE = 5000;

export async function initFieldsRoute(setup: CoreSetup) {
  const router = setup.http.createRouter();
  router.post(
    {
      path: '/index_stats/{indexPatternTitle}/field',
      validate: {
        params: schema.object({
          indexPatternTitle: schema.string(),
        }),
        body: schema.object(
          {
            query: schema.object({}, { allowUnknowns: true }),
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
      const { earliest, latest, timeFieldName, field, query } = req.body;

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
              query,
            ],
          },
        };

        const search = (aggs: unknown) =>
          requestClient.callAsCurrentUser('search', {
            index: req.params.indexPatternTitle,
            body: {
              query: filters,
              aggs,
            },
            size: 0,
          });

        if (field.type === 'number') {
          return res.ok({
            body: await getNumberHistogram(search, field),
          });
        } else if (field.type === 'string') {
          return res.ok({
            body: await getStringSamples(search, field),
          });
        } else if (field.type === 'date') {
          return res.ok({
            body: await getDateHistogram(search, field, { earliest, latest }),
          });
        }

        return res.ok({});
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

export async function getNumberHistogram(
  aggSearchWithBody: (body: unknown) => Promise<unknown>,
  field: { name: string; type: string; esTypes?: string[] }
) {
  const searchBody = {
    sample: {
      sampler: { shard_size: SHARD_SIZE },
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
  };

  const minMaxResult = (await aggSearchWithBody(searchBody)) as AggregationSearchResponse<
    unknown,
    { body: { aggs: typeof searchBody } }
  >;

  const minValue = minMaxResult.aggregations!.sample.min_value.value;
  const maxValue = minMaxResult.aggregations!.sample.max_value.value;
  const terms = minMaxResult.aggregations!.sample.top_values;

  let histogramInterval = (maxValue! - minValue!) / 10;

  if (Number.isInteger(minValue!) && Number.isInteger(maxValue!)) {
    histogramInterval = Math.ceil(histogramInterval);
  }

  if (histogramInterval === 0) {
    return {
      top_values: terms,
      histogram: { buckets: [], doc_count: minMaxResult.aggregations!.sample.doc_count },
    };
  }

  const histogramBody = {
    sample: {
      sampler: { shard_size: SHARD_SIZE },
      aggs: {
        histo: {
          histogram: {
            field: field.name,
            interval: histogramInterval,
          },
        },
      },
    },
  };
  const histogramResult = (await aggSearchWithBody(histogramBody)) as AggregationSearchResponse<
    unknown,
    { body: { aggs: typeof histogramBody } }
  >;

  return {
    histogram: histogramResult.aggregations!.sample,
    top_values: terms,
  };
}

export async function getStringSamples(
  aggSearchWithBody: (body: unknown) => unknown,
  field: { name: string; type: string }
) {
  const topValuesBody = {
    sample: {
      sampler: { shard_size: SHARD_SIZE },
      aggs: {
        top_values: {
          terms: { field: field.name, size: 10 },
        },
      },
    },
  };
  const topValuesResult = (await aggSearchWithBody(topValuesBody)) as AggregationSearchResponse<
    unknown,
    { body: { aggs: typeof topValuesBody } }
  >;

  return topValuesResult.aggregations!.sample;
}

// This one is not sampled so that it returns the full date range
export async function getDateHistogram(
  aggSearchWithBody: (body: unknown) => unknown,
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

  const histogramBody = {
    histo: {
      date_histogram: { field: field.name, fixed_interval: fixedInterval },
    },
  };
  const results = (await aggSearchWithBody(histogramBody)) as AggregationSearchResponse<
    unknown,
    { body: { aggs: typeof histogramBody } }
  >;

  return {
    histogram: results.aggregations,
  };
}
