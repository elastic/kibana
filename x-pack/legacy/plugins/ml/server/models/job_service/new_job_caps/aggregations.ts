/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Aggregation } from '../../../../common/types/fields';
import {
  ML_JOB_AGGREGATION,
  KIBANA_AGGREGATION,
  ES_AGGREGATION,
} from '../../../../common/constants/aggregation_types';

export const aggregations: Aggregation[] = [
  {
    id: ML_JOB_AGGREGATION.COUNT,
    title: 'Count',
    kibanaName: KIBANA_AGGREGATION.COUNT,
    dslName: ES_AGGREGATION.COUNT,
    type: 'metrics',
    mlModelPlotAgg: {
      max: KIBANA_AGGREGATION.MAX,
      min: KIBANA_AGGREGATION.MIN,
    },
    fields: [],
  },
  {
    id: ML_JOB_AGGREGATION.HIGH_COUNT,
    title: 'High count',
    kibanaName: KIBANA_AGGREGATION.COUNT,
    dslName: ES_AGGREGATION.COUNT,
    type: 'metrics',
    mlModelPlotAgg: {
      max: KIBANA_AGGREGATION.MAX,
      min: KIBANA_AGGREGATION.MIN,
    },
    fields: [],
  },
  {
    id: ML_JOB_AGGREGATION.LOW_COUNT,
    title: 'Low count',
    kibanaName: KIBANA_AGGREGATION.COUNT,
    dslName: ES_AGGREGATION.COUNT,
    type: 'metrics',
    mlModelPlotAgg: {
      max: KIBANA_AGGREGATION.MAX,
      min: KIBANA_AGGREGATION.MIN,
    },
    fields: [],
  },
  {
    id: ML_JOB_AGGREGATION.MEAN,
    title: 'Mean',
    kibanaName: KIBANA_AGGREGATION.AVG,
    dslName: ES_AGGREGATION.AVG,
    type: 'metrics',
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
    type: 'metrics',
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
    type: 'metrics',
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
    type: 'metrics',
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
    type: 'metrics',
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
    type: 'metrics',
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
    type: 'metrics',
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
    type: 'metrics',
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
    type: 'metrics',
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
    type: 'metrics',
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
    type: 'metrics',
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
    type: 'metrics',
    mlModelPlotAgg: {
      max: KIBANA_AGGREGATION.MAX,
      min: KIBANA_AGGREGATION.MIN,
    },
    fields: [],
  },
];
