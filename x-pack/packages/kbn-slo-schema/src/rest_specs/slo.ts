/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import {
  allOrAnyString,
  allOrAnyStringOrArray,
  apmTransactionDurationIndicatorSchema,
  apmTransactionErrorRateIndicatorSchema,
  budgetingMethodSchema,
  dateType,
  durationType,
  groupingsSchema,
  groupSummarySchema,
  histogramIndicatorSchema,
  historicalSummarySchema,
  indicatorSchema,
  indicatorTypesSchema,
  kqlCustomIndicatorSchema,
  kqlWithFiltersSchema,
  metaSchema,
  metricCustomIndicatorSchema,
  objectiveSchema,
  previewDataSchema,
  querySchema,
  settingsSchema,
  sloIdSchema,
  summarySchema,
  syntheticsAvailabilityIndicatorSchema,
  tagsSchema,
  timesliceMetricBasicMetricWithField,
  timesliceMetricDocCountMetric,
  timesliceMetricIndicatorSchema,
  timesliceMetricPercentileMetric,
  timeWindowSchema,
  timeWindowTypeSchema,
} from '../schema';

const getPreviewDataParamsSchema = t.type({
  body: t.intersection([
    t.type({
      indicator: indicatorSchema,
      range: t.type({
        start: t.number,
        end: t.number,
      }),
    }),
    t.partial({
      objective: objectiveSchema,
      instanceId: t.string,
      groupBy: t.string,
      remoteName: t.string,
      groupings: t.record(t.string, t.unknown),
    }),
  ]),
});

const getPreviewDataResponseSchema = t.array(previewDataSchema);

const sloResponseSchema = t.intersection([
  t.type({
    id: sloIdSchema,
    name: t.string,
    description: t.string,
    indicator: indicatorSchema,
    timeWindow: timeWindowSchema,
    budgetingMethod: budgetingMethodSchema,
    objective: objectiveSchema,
    revision: t.number,
    settings: settingsSchema,
    enabled: t.boolean,
    tags: tagsSchema,
    groupBy: allOrAnyStringOrArray,
    createdAt: dateType,
    updatedAt: dateType,
    version: t.number,
  }),
  t.partial({
    instanceId: allOrAnyString,
    remoteName: t.string,
    kibanaUrl: t.string,
  }),
]);

const sloWithSummaryResponseSchema = t.intersection([
  sloResponseSchema,
  t.intersection([
    t.type({ summary: summarySchema, groupings: groupingsSchema }),
    t.partial({ meta: metaSchema }),
  ]),
]);

const getSLOQuerySchema = t.partial({
  query: t.partial({
    instanceId: allOrAnyString,
    remoteName: t.string,
  }),
});
const getSLOParamsSchema = t.intersection([
  t.type({
    path: t.type({
      id: sloIdSchema,
    }),
  }),
  getSLOQuerySchema,
]);

const getSLOResponseSchema = sloWithSummaryResponseSchema;

const manageSLOParamsSchema = t.type({
  path: t.type({ id: sloIdSchema }),
});

const resetSLOParamsSchema = t.type({
  path: t.type({ id: sloIdSchema }),
});

const resetSLOResponseSchema = sloResponseSchema;

const deleteSLOInstancesParamsSchema = t.type({
  body: t.type({ list: t.array(t.type({ sloId: sloIdSchema, instanceId: t.string })) }),
});

const fetchHistoricalSummaryParamsSchema = t.type({
  body: t.type({
    list: t.array(
      t.intersection([
        t.type({
          sloId: sloIdSchema,
          instanceId: t.string,
          timeWindow: timeWindowSchema,
          budgetingMethod: budgetingMethodSchema,
          objective: objectiveSchema,
          groupBy: allOrAnyStringOrArray,
          revision: t.number,
        }),
        t.partial({ remoteName: t.string }),
      ])
    ),
  }),
});

const fetchHistoricalSummaryResponseSchema = t.array(
  t.type({
    sloId: sloIdSchema,
    instanceId: allOrAnyString,
    data: t.array(historicalSummarySchema),
  })
);

const getSLOBurnRatesResponseSchema = t.type({
  burnRates: t.array(
    t.type({
      name: t.string,
      burnRate: t.number,
      sli: t.number,
    })
  ),
});

const getSLOBurnRatesParamsSchema = t.type({
  path: t.type({ id: t.string }),
  body: t.intersection([
    t.type({
      instanceId: allOrAnyString,
      windows: t.array(
        t.type({
          name: t.string,
          duration: durationType,
        })
      ),
    }),
    t.partial({ remoteName: t.string }),
  ]),
});

const getSLOInstancesParamsSchema = t.type({
  path: t.type({ id: t.string }),
});

const getSLOInstancesResponseSchema = t.type({
  groupBy: t.union([t.string, t.array(t.string)]),
  instances: t.array(t.string),
});

type SLOResponse = t.OutputOf<typeof sloResponseSchema>;
type SLOWithSummaryResponse = t.OutputOf<typeof sloWithSummaryResponseSchema>;

type GetSLOParams = t.TypeOf<typeof getSLOQuerySchema.props.query>;
type GetSLOResponse = t.OutputOf<typeof getSLOResponseSchema>;

type ManageSLOParams = t.TypeOf<typeof manageSLOParamsSchema.props.path>;

type ResetSLOParams = t.TypeOf<typeof resetSLOParamsSchema.props.path>;
type ResetSLOResponse = t.OutputOf<typeof resetSLOResponseSchema>;

type DeleteSLOInstancesInput = t.OutputOf<typeof deleteSLOInstancesParamsSchema.props.body>;
type DeleteSLOInstancesParams = t.TypeOf<typeof deleteSLOInstancesParamsSchema.props.body>;

type FetchHistoricalSummaryParams = t.TypeOf<typeof fetchHistoricalSummaryParamsSchema.props.body>;
type FetchHistoricalSummaryResponse = t.OutputOf<typeof fetchHistoricalSummaryResponseSchema>;
type HistoricalSummaryResponse = t.OutputOf<typeof historicalSummarySchema>;

type GetPreviewDataParams = t.TypeOf<typeof getPreviewDataParamsSchema.props.body>;
type GetPreviewDataResponse = t.OutputOf<typeof getPreviewDataResponseSchema>;

type GetSLOInstancesResponse = t.OutputOf<typeof getSLOInstancesResponseSchema>;

type GetSLOBurnRatesResponse = t.OutputOf<typeof getSLOBurnRatesResponseSchema>;
type BudgetingMethod = t.OutputOf<typeof budgetingMethodSchema>;
type TimeWindowType = t.OutputOf<typeof timeWindowTypeSchema>;
type TimeWindow = t.OutputOf<typeof timeWindowSchema>;
type IndicatorType = t.OutputOf<typeof indicatorTypesSchema>;
type Indicator = t.OutputOf<typeof indicatorSchema>;
type Objective = t.OutputOf<typeof objectiveSchema>;
type APMTransactionErrorRateIndicator = t.OutputOf<typeof apmTransactionErrorRateIndicatorSchema>;
type APMTransactionDurationIndicator = t.OutputOf<typeof apmTransactionDurationIndicatorSchema>;
type SyntheticsAvailabilityIndicator = t.OutputOf<typeof syntheticsAvailabilityIndicatorSchema>;
type MetricCustomIndicator = t.OutputOf<typeof metricCustomIndicatorSchema>;
type TimesliceMetricIndicator = t.OutputOf<typeof timesliceMetricIndicatorSchema>;
type TimesliceMetricBasicMetricWithField = t.OutputOf<typeof timesliceMetricBasicMetricWithField>;
type TimesliceMetricDocCountMetric = t.OutputOf<typeof timesliceMetricDocCountMetric>;
type TimesclieMetricPercentileMetric = t.OutputOf<typeof timesliceMetricPercentileMetric>;
type HistogramIndicator = t.OutputOf<typeof histogramIndicatorSchema>;
type KQLCustomIndicator = t.OutputOf<typeof kqlCustomIndicatorSchema>;
type GroupSummary = t.TypeOf<typeof groupSummarySchema>;
type KqlWithFiltersSchema = t.TypeOf<typeof kqlWithFiltersSchema>;
type QuerySchema = t.TypeOf<typeof querySchema>;

export {
  deleteSLOInstancesParamsSchema,
  getPreviewDataParamsSchema,
  getPreviewDataResponseSchema,
  getSLOParamsSchema,
  getSLOResponseSchema,
  fetchHistoricalSummaryParamsSchema,
  fetchHistoricalSummaryResponseSchema,
  manageSLOParamsSchema,
  resetSLOParamsSchema,
  resetSLOResponseSchema,
  sloResponseSchema,
  sloWithSummaryResponseSchema,
  getSLOBurnRatesParamsSchema,
  getSLOBurnRatesResponseSchema,
  getSLOInstancesParamsSchema,
  getSLOInstancesResponseSchema,
};
export type {
  BudgetingMethod,
  DeleteSLOInstancesInput,
  DeleteSLOInstancesParams,
  GetPreviewDataParams,
  GetPreviewDataResponse,
  GetSLOParams,
  GetSLOResponse,
  FetchHistoricalSummaryParams,
  FetchHistoricalSummaryResponse,
  HistoricalSummaryResponse,
  ManageSLOParams,
  ResetSLOParams,
  ResetSLOResponse,
  SLOResponse,
  SLOWithSummaryResponse,
  APMTransactionDurationIndicator,
  APMTransactionErrorRateIndicator,
  SyntheticsAvailabilityIndicator,
  GetSLOBurnRatesResponse,
  GetSLOInstancesResponse,
  IndicatorType,
  Indicator,
  Objective,
  MetricCustomIndicator,
  TimesliceMetricIndicator,
  TimesliceMetricBasicMetricWithField,
  TimesclieMetricPercentileMetric,
  TimesliceMetricDocCountMetric,
  HistogramIndicator,
  KQLCustomIndicator,
  TimeWindow,
  TimeWindowType,
  GroupSummary,
  KqlWithFiltersSchema,
  QuerySchema,
};
