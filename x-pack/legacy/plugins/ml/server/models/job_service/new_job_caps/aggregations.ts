/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Aggregation, METRIC_AGG_TYPE } from '../../../../common/types/fields';
import {
  ML_JOB_AGGREGATION,
  KIBANA_AGGREGATION,
  ES_AGGREGATION,
} from '../../../../common/constants/aggregation_types';

// aggregation object missing id, title and fields and has null for kibana and dsl aggregation names.
// this is used as the basis for the ML only aggregations
function getBasicMlOnlyAggregation(): Omit<Aggregation, 'id' | 'title' | 'fields'> {
  return {
    kibanaName: null,
    dslName: null,
    type: METRIC_AGG_TYPE,
    mlModelPlotAgg: {
      max: KIBANA_AGGREGATION.MAX,
      min: KIBANA_AGGREGATION.MIN,
    },
  };
}

// list of aggregations only support by ML and which don't have an equivalent ES aggregation
// note, not all aggs have a field list. Some aggs cannot be used with a field.
export const mlOnlyAggregations: Aggregation[] = [
  {
    id: ML_JOB_AGGREGATION.NON_ZERO_COUNT,
    title: 'Non zero count',
    ...getBasicMlOnlyAggregation(),
  },
  {
    id: ML_JOB_AGGREGATION.HIGH_NON_ZERO_COUNT,
    title: 'High non zero count',
    ...getBasicMlOnlyAggregation(),
  },
  {
    id: ML_JOB_AGGREGATION.LOW_NON_ZERO_COUNT,
    title: 'Low non zero count',
    ...getBasicMlOnlyAggregation(),
  },
  {
    id: ML_JOB_AGGREGATION.HIGH_DISTINCT_COUNT,
    title: 'High distinct count',
    fields: [],
    ...getBasicMlOnlyAggregation(),
  },
  {
    id: ML_JOB_AGGREGATION.LOW_DISTINCT_COUNT,
    title: 'Low distinct count',
    fields: [],
    ...getBasicMlOnlyAggregation(),
  },
  {
    id: ML_JOB_AGGREGATION.METRIC,
    title: 'Metric',
    fields: [],
    ...getBasicMlOnlyAggregation(),
  },
  {
    id: ML_JOB_AGGREGATION.VARP,
    title: 'varp',
    fields: [],
    ...getBasicMlOnlyAggregation(),
  },
  {
    id: ML_JOB_AGGREGATION.HIGH_VARP,
    title: 'High varp',
    fields: [],
    ...getBasicMlOnlyAggregation(),
  },
  {
    id: ML_JOB_AGGREGATION.LOW_VARP,
    title: 'Low varp',
    fields: [],
    ...getBasicMlOnlyAggregation(),
  },
  {
    id: ML_JOB_AGGREGATION.NON_NULL_SUM,
    title: 'Non null sum',
    fields: [],
    ...getBasicMlOnlyAggregation(),
  },
  {
    id: ML_JOB_AGGREGATION.HIGH_NON_NULL_SUM,
    title: 'High non null sum',
    fields: [],
    ...getBasicMlOnlyAggregation(),
  },
  {
    id: ML_JOB_AGGREGATION.LOW_NON_NULL_SUM,
    title: 'Low non null sum',
    fields: [],
    ...getBasicMlOnlyAggregation(),
  },
  {
    id: ML_JOB_AGGREGATION.RARE,
    title: 'Rare',
    ...getBasicMlOnlyAggregation(),
  },
  {
    id: ML_JOB_AGGREGATION.FREQ_RARE,
    title: 'Freq rare',
    ...getBasicMlOnlyAggregation(),
  },
  {
    id: ML_JOB_AGGREGATION.INFO_CONTENT,
    title: 'Info content',
    fields: [],
    ...getBasicMlOnlyAggregation(),
  },
  {
    id: ML_JOB_AGGREGATION.HIGH_INFO_CONTENT,
    title: 'High info content',
    fields: [],
    ...getBasicMlOnlyAggregation(),
  },
  {
    id: ML_JOB_AGGREGATION.LOW_INFO_CONTENT,
    title: 'Low info content',
    fields: [],
    ...getBasicMlOnlyAggregation(),
  },
  {
    id: ML_JOB_AGGREGATION.TIME_OF_DAY,
    title: 'Time of day',
    ...getBasicMlOnlyAggregation(),
  },
  {
    id: ML_JOB_AGGREGATION.TIME_OF_WEEK,
    title: 'Time of week',
    ...getBasicMlOnlyAggregation(),
  },
  {
    id: ML_JOB_AGGREGATION.LAT_LONG,
    title: 'Lat long',
    fields: [],
    ...getBasicMlOnlyAggregation(),
  },
];

export const aggregations: Aggregation[] = [
  {
    id: ML_JOB_AGGREGATION.COUNT,
    title: 'Count',
    kibanaName: KIBANA_AGGREGATION.COUNT,
    dslName: ES_AGGREGATION.COUNT,
    type: METRIC_AGG_TYPE,
    mlModelPlotAgg: {
      max: KIBANA_AGGREGATION.MAX,
      min: KIBANA_AGGREGATION.MIN,
    },
  },
  {
    id: ML_JOB_AGGREGATION.HIGH_COUNT,
    title: 'High count',
    kibanaName: KIBANA_AGGREGATION.COUNT,
    dslName: ES_AGGREGATION.COUNT,
    type: METRIC_AGG_TYPE,
    mlModelPlotAgg: {
      max: KIBANA_AGGREGATION.MAX,
      min: KIBANA_AGGREGATION.MIN,
    },
  },
  {
    id: ML_JOB_AGGREGATION.LOW_COUNT,
    title: 'Low count',
    kibanaName: KIBANA_AGGREGATION.COUNT,
    dslName: ES_AGGREGATION.COUNT,
    type: METRIC_AGG_TYPE,
    mlModelPlotAgg: {
      max: KIBANA_AGGREGATION.MAX,
      min: KIBANA_AGGREGATION.MIN,
    },
  },
  {
    id: ML_JOB_AGGREGATION.MEAN,
    title: 'Mean',
    kibanaName: KIBANA_AGGREGATION.AVG,
    dslName: ES_AGGREGATION.AVG,
    type: METRIC_AGG_TYPE,
    mlModelPlotAgg: {
      max: KIBANA_AGGREGATION.AVG,
      min: KIBANA_AGGREGATION.AVG,
    },
    fields: [],
  },
  {
    id: ML_JOB_AGGREGATION.HIGH_MEAN,
    title: 'High mean',
    kibanaName: KIBANA_AGGREGATION.AVG,
    dslName: ES_AGGREGATION.AVG,
    type: METRIC_AGG_TYPE,
    mlModelPlotAgg: {
      max: KIBANA_AGGREGATION.AVG,
      min: KIBANA_AGGREGATION.AVG,
    },
    fields: [],
  },
  {
    id: ML_JOB_AGGREGATION.LOW_MEAN,
    title: 'Low mean',
    kibanaName: KIBANA_AGGREGATION.AVG,
    dslName: ES_AGGREGATION.AVG,
    type: METRIC_AGG_TYPE,
    mlModelPlotAgg: {
      max: KIBANA_AGGREGATION.AVG,
      min: KIBANA_AGGREGATION.AVG,
    },
    fields: [],
  },
  {
    id: ML_JOB_AGGREGATION.SUM,
    title: 'Sum',
    kibanaName: KIBANA_AGGREGATION.SUM,
    dslName: ES_AGGREGATION.SUM,
    type: METRIC_AGG_TYPE,
    mlModelPlotAgg: {
      max: KIBANA_AGGREGATION.SUM,
      min: KIBANA_AGGREGATION.SUM,
    },
    fields: [],
  },
  {
    id: ML_JOB_AGGREGATION.HIGH_SUM,
    title: 'High sum',
    kibanaName: KIBANA_AGGREGATION.SUM,
    dslName: ES_AGGREGATION.SUM,
    type: METRIC_AGG_TYPE,
    mlModelPlotAgg: {
      max: KIBANA_AGGREGATION.SUM,
      min: KIBANA_AGGREGATION.SUM,
    },
    fields: [],
  },
  {
    id: ML_JOB_AGGREGATION.LOW_SUM,
    title: 'Low sum',
    kibanaName: KIBANA_AGGREGATION.SUM,
    dslName: ES_AGGREGATION.SUM,
    type: METRIC_AGG_TYPE,
    mlModelPlotAgg: {
      max: KIBANA_AGGREGATION.SUM,
      min: KIBANA_AGGREGATION.SUM,
    },
    fields: [],
  },
  {
    id: ML_JOB_AGGREGATION.MEDIAN,
    title: 'Median',
    kibanaName: KIBANA_AGGREGATION.MEDIAN,
    dslName: ES_AGGREGATION.PERCENTILES,
    type: METRIC_AGG_TYPE,
    mlModelPlotAgg: {
      max: KIBANA_AGGREGATION.MAX,
      min: KIBANA_AGGREGATION.MIN,
    },
    fields: [],
  },
  {
    id: ML_JOB_AGGREGATION.HIGH_MEDIAN,
    title: 'High median',
    kibanaName: KIBANA_AGGREGATION.MEDIAN,
    dslName: ES_AGGREGATION.PERCENTILES,
    type: METRIC_AGG_TYPE,
    mlModelPlotAgg: {
      max: KIBANA_AGGREGATION.MAX,
      min: KIBANA_AGGREGATION.MIN,
    },
    fields: [],
  },
  {
    id: ML_JOB_AGGREGATION.LOW_MEDIAN,
    title: 'Low median',
    kibanaName: KIBANA_AGGREGATION.MEDIAN,
    dslName: ES_AGGREGATION.PERCENTILES,
    type: METRIC_AGG_TYPE,
    mlModelPlotAgg: {
      max: KIBANA_AGGREGATION.MAX,
      min: KIBANA_AGGREGATION.MIN,
    },
    fields: [],
  },
  {
    id: ML_JOB_AGGREGATION.MIN,
    title: 'Min',
    kibanaName: KIBANA_AGGREGATION.MIN,
    dslName: ES_AGGREGATION.MIN,
    type: METRIC_AGG_TYPE,
    mlModelPlotAgg: {
      max: KIBANA_AGGREGATION.MIN,
      min: KIBANA_AGGREGATION.MIN,
    },
    fields: [],
  },
  {
    id: ML_JOB_AGGREGATION.MAX,
    title: 'Max',
    kibanaName: KIBANA_AGGREGATION.MAX,
    dslName: ES_AGGREGATION.MAX,
    type: METRIC_AGG_TYPE,
    mlModelPlotAgg: {
      max: KIBANA_AGGREGATION.MAX,
      min: KIBANA_AGGREGATION.MAX,
    },
    fields: [],
  },
  {
    id: ML_JOB_AGGREGATION.DISTINCT_COUNT,
    title: 'Distinct count',
    kibanaName: KIBANA_AGGREGATION.CARDINALITY,
    dslName: ES_AGGREGATION.CARDINALITY,
    type: METRIC_AGG_TYPE,
    mlModelPlotAgg: {
      max: KIBANA_AGGREGATION.MAX,
      min: KIBANA_AGGREGATION.MIN,
    },
    fields: [],
  },
];
