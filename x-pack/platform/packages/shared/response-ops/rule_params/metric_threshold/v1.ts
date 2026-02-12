/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { COMPARATORS } from '@kbn/alerting-comparators';

import {
  LEGACY_COMPARATORS,
  oneOfLiterals,
  validateIsStringElasticsearchJSONFilter,
} from '../common/utils';

const METRIC_EXPLORER_AGGREGATIONS = [
  'avg',
  'max',
  'min',
  'cardinality',
  'rate',
  'count',
  'sum',
  'p95',
  'p99',
  'custom',
] as const;

const comparator = Object.values({ ...COMPARATORS, ...LEGACY_COMPARATORS });

const baseCriterion = {
  threshold: schema.arrayOf(schema.number(), {
    meta: {
      description:
        'The threshold value that is used with the `comparator`. If the `comparator` is `between`, you must specify the boundary values.',
    },
  }),
  comparator: oneOfLiterals(comparator),
  timeUnit: schema.string({
    meta: {
      description: 'The type of units for the time window: seconds, minutes, hours, or days.',
    },
  }),
  timeSize: schema.number({
    meta: {
      description:
        'The size of the time window (in `timeUnit` units), which determines how far back to search for documents. Generally it should be a value higher than the rule check interval to avoid gaps in detection.',
    },
  }),
  warningThreshold: schema.maybe(
    schema.arrayOf(
      schema.number({
        meta: {
          description:
            'The threshold value that is used with the `warningComparator`. If the `warningComparator` is `between`, you must specify the boundary values.',
        },
      })
    )
  ),
  warningComparator: schema.maybe(oneOfLiterals(comparator)),
};

const nonCountCriterion = schema.object({
  ...baseCriterion,
  metric: schema.string(),
  aggType: oneOfLiterals(METRIC_EXPLORER_AGGREGATIONS),
  customMetrics: schema.never(),
  equation: schema.never(),
  label: schema.never(),
});

const countCriterion = schema.object({
  ...baseCriterion,
  aggType: schema.literal('count'),
  metric: schema.never(),
  customMetrics: schema.never(),
  equation: schema.never(),
  label: schema.never(),
});

const customCriterion = schema.object({
  ...baseCriterion,
  aggType: schema.literal('custom'),
  metric: schema.never(),
  customMetrics: schema.arrayOf(
    schema.oneOf([
      schema.object({
        name: schema.string(),
        aggType: oneOfLiterals(['avg', 'sum', 'max', 'min', 'cardinality']),
        field: schema.string(),
        filter: schema.never(),
      }),
      schema.object({
        name: schema.string(),
        aggType: schema.literal('count'),
        filter: schema.maybe(schema.string()),
        field: schema.never(),
      }),
    ])
  ),
  equation: schema.maybe(schema.string()),
  label: schema.maybe(schema.string()),
});

export const metricThresholdRuleParamsSchema = schema.object(
  {
    criteria: schema.arrayOf(schema.oneOf([countCriterion, nonCountCriterion, customCriterion])),
    groupBy: schema.maybe(
      schema.oneOf([schema.string(), schema.arrayOf(schema.string())], {
        meta: {
          description:
            'Create an alert for every unique value of the specified fields. For example, you can create a rule per host or every mount point of each host. IMPORTANT: If you include the same field in both the `filterQuery` and `groupBy`, you might receive fewer results than you expect. For example, if you filter by `cloud.region: us-east`, grouping by `cloud.region` will have no effect because the filter query can match only one region.',
        },
      })
    ),
    filterQuery: schema.maybe(
      schema.string({
        validate: validateIsStringElasticsearchJSONFilter,
        meta: {
          description:
            'A query that limits the scope of the rule. The rule evaluates only metric data that matches the query.',
        },
      })
    ),
    sourceId: schema.string(),
    alertOnNoData: schema.maybe(
      schema.boolean({
        meta: {
          description:
            'If true, an alert occurs if the metrics do not report any data over the expected period or if the query fails.',
        },
      })
    ),
    alertOnGroupDisappear: schema.maybe(
      schema.boolean({
        meta: {
          description:
            'If true, an alert occurs if a group that previously reported metrics does not report them again over the expected time period. This check is not recommended for dynamically scaling infrastructures that might rapidly start and stop nodes automatically.',
        },
      })
    ),
  },
  { unknowns: 'allow' }
);
