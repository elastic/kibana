/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';

const numberOrNull = t.union([t.number, t.null]);
const sortOrder = t.union([t.literal('asc'), t.literal('desc')]);

const sortInstruction = t.dictionary(
  t.string,
  t.union([
    sortOrder,
    t.type({
      order: sortOrder
    })
  ])
);

const sort = t.union([sortInstruction, t.array(sortInstruction)]);

const script = t.type({
  lang: t.literal('expression'),
  source: t.string
});

const metricsRt = {
  in: t.union([
    t.type({
      field: t.string
    }),
    t.type({
      script
    })
  ]),
  out: t.type({
    value: numberOrNull
  })
};

export const aggregationRts = {
  terms: {
    in: t.intersection([
      t.type({
        field: t.string
      }),
      t.partial({
        size: t.number,
        missing: t.string,
        order: sort
      })
    ]),
    out: t.type({
      buckets: t.array(
        t.type({
          doc_count: t.number,
          key: t.string
        })
      )
    }),
    aggs: 'bucket' as const
  },
  date_histogram: {
    in: t.intersection([
      t.type({
        field: t.string
      }),
      t.union([
        t.type({
          calendar_interval: t.string
        }),
        t.type({
          fixed_interval: t.string
        })
      ]),
      t.partial({
        format: t.string,
        min_doc_count: t.number,
        extended_bounds: t.type({
          min: t.number,
          max: t.number
        })
      })
    ]),
    out: t.type({
      buckets: t.array(
        t.type({
          doc_count: t.number,
          key: t.number,
          key_as_string: t.string
        })
      )
    }),
    aggs: 'bucket' as const
  },
  histogram: {
    in: t.intersection([
      t.type({
        field: t.string,
        interval: t.number
      }),
      t.partial({
        min_doc_count: t.number,
        extended_bounds: t.type({
          min: t.number,
          max: t.number
        })
      })
    ]),
    out: t.type({
      buckets: t.array(
        t.type({
          doc_count: t.number,
          key: t.number
        })
      )
    }),
    aggs: 'bucket' as const
  },
  avg: metricsRt,
  max: metricsRt,
  min: metricsRt,
  sum: metricsRt,
  extended_stats: {
    in: t.type({
      field: t.string
    }),
    out: t.type({
      count: t.number,
      min: numberOrNull,
      max: numberOrNull,
      avg: numberOrNull,
      sum: t.number,
      sum_of_squares: numberOrNull,
      variance: numberOrNull,
      std_deviation: numberOrNull,
      std_deviation_bounds: t.type({
        upper: numberOrNull,
        lower: numberOrNull
      })
    })
  },
  top_hits: {
    in: t.partial({
      from: t.number,
      size: t.number,
      sort,
      _source: t.union([t.string, t.array(t.string)])
    }),
    out: t.type({
      hits: t.type({
        total: t.type({
          value: t.number,
          relation: t.keyof({
            eq: null,
            gte: null
          })
        }),
        max_score: numberOrNull,
        hits: t.array(
          t.type({
            _source: t.undefined
          })
        )
      })
    })
  },
  percentiles: {
    in: t.union([
      t.type({
        field: t.string
      }),
      t.partial({
        percents: t.array(t.number)
      })
    ]),
    out: t.type({
      values: t.dictionary(t.string, t.number)
    })
  }
};

export type Aggregations = typeof aggregationRts;
