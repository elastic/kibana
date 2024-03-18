/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { toBooleanRt } from '@kbn/io-ts-utils';
import {
  allOrAnyString,
  apmTransactionDurationIndicatorSchema,
  apmTransactionErrorRateIndicatorSchema,
  syntheticsAvailabilityIndicatorSchema,
  budgetingMethodSchema,
  dateType,
  durationType,
  groupingsSchema,
  histogramIndicatorSchema,
  historicalSummarySchema,
  indicatorSchema,
  indicatorTypesSchema,
  kqlCustomIndicatorSchema,
  metricCustomIndicatorSchema,
  metaSchema,
  timesliceMetricIndicatorSchema,
  objectiveSchema,
  optionalSettingsSchema,
  previewDataSchema,
  settingsSchema,
  sloIdSchema,
  summarySchema,
  groupSummarySchema,
  tagsSchema,
  timeWindowSchema,
  timeWindowTypeSchema,
  timesliceMetricBasicMetricWithField,
  timesliceMetricDocCountMetric,
  timesliceMetricPercentileMetric,
  allOrAnyStringOrArray,
  kqlWithFiltersSchema,
  querySchema,
} from '../schema';

const createSLOParamsSchema = t.type({
  body: t.intersection([
    t.type({
      name: t.string,
      description: t.string,
      indicator: indicatorSchema,
      timeWindow: timeWindowSchema,
      budgetingMethod: budgetingMethodSchema,
      objective: objectiveSchema,
    }),
    t.partial({
      id: sloIdSchema,
      settings: optionalSettingsSchema,
      tags: tagsSchema,
      groupBy: allOrAnyStringOrArray,
      revision: t.number,
    }),
  ]),
});

const createSLOResponseSchema = t.type({
  id: sloIdSchema,
});

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
      groupings: t.record(t.string, t.unknown),
    }),
  ]),
});

const getPreviewDataResponseSchema = t.array(previewDataSchema);

const deleteSLOParamsSchema = t.type({
  path: t.type({
    id: sloIdSchema,
  }),
});

const sortDirectionSchema = t.union([t.literal('asc'), t.literal('desc')]);
const sortBySchema = t.union([
  t.literal('error_budget_consumed'),
  t.literal('error_budget_remaining'),
  t.literal('sli_value'),
  t.literal('status'),
]);

const findSLOParamsSchema = t.partial({
  query: t.partial({
    filters: t.string,
    kqlQuery: t.string,
    page: t.string,
    perPage: t.string,
    sortBy: sortBySchema,
    sortDirection: sortDirectionSchema,
  }),
});

const groupBySchema = t.union([
  t.literal('ungrouped'),
  t.literal('slo.tags'),
  t.literal('status'),
  t.literal('slo.indicator.type'),
]);

const findSLOGroupsParamsSchema = t.partial({
  query: t.partial({
    page: t.string,
    perPage: t.string,
    groupBy: groupBySchema,
    kqlQuery: t.string,
    filters: t.string,
  }),
});

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
  }),
]);

const sloWithSummaryResponseSchema = t.intersection([
  sloResponseSchema,
  t.intersection([
    t.type({ summary: summarySchema, groupings: groupingsSchema }),
    t.partial({ meta: metaSchema }),
  ]),
]);

const sloGroupWithSummaryResponseSchema = t.type({
  group: t.string,
  groupBy: t.string,
  summary: groupSummarySchema,
});

const getSLOQuerySchema = t.partial({
  query: t.partial({
    instanceId: allOrAnyString,
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

const updateSLOParamsSchema = t.type({
  path: t.type({
    id: sloIdSchema,
  }),
  body: t.partial({
    name: t.string,
    description: t.string,
    indicator: indicatorSchema,
    timeWindow: timeWindowSchema,
    budgetingMethod: budgetingMethodSchema,
    objective: objectiveSchema,
    settings: optionalSettingsSchema,
    tags: tagsSchema,
    groupBy: allOrAnyStringOrArray,
  }),
});

const manageSLOParamsSchema = t.type({
  path: t.type({ id: sloIdSchema }),
});

const resetSLOParamsSchema = t.type({
  path: t.type({ id: sloIdSchema }),
});

const resetSLOResponseSchema = sloResponseSchema;

const updateSLOResponseSchema = sloResponseSchema;

const findSLOResponseSchema = t.type({
  page: t.number,
  perPage: t.number,
  total: t.number,
  results: t.array(sloWithSummaryResponseSchema),
});

const findSLOGroupsResponseSchema = t.type({
  page: t.number,
  perPage: t.number,
  total: t.number,
  results: t.array(sloGroupWithSummaryResponseSchema),
});

const deleteSLOInstancesParamsSchema = t.type({
  body: t.type({ list: t.array(t.type({ sloId: sloIdSchema, instanceId: t.string })) }),
});

const fetchHistoricalSummaryParamsSchema = t.type({
  body: t.type({
    list: t.array(t.type({ sloId: sloIdSchema, instanceId: t.string })),
  }),
});

const fetchHistoricalSummaryResponseSchema = t.array(
  t.type({
    sloId: sloIdSchema,
    instanceId: allOrAnyString,
    data: t.array(historicalSummarySchema),
  })
);

const findSloDefinitionsParamsSchema = t.partial({
  query: t.partial({
    search: t.string,
    includeOutdatedOnly: toBooleanRt,
    page: t.string,
    perPage: t.string,
  }),
});

const findSloDefinitionsResponseSchema = t.type({
  page: t.number,
  perPage: t.number,
  total: t.number,
  results: t.array(sloResponseSchema),
});

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
  body: t.type({
    instanceId: allOrAnyString,
    windows: t.array(
      t.type({
        name: t.string,
        duration: durationType,
      })
    ),
  }),
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

type SLOGroupWithSummaryResponse = t.OutputOf<typeof sloGroupWithSummaryResponseSchema>;

type CreateSLOInput = t.OutputOf<typeof createSLOParamsSchema.props.body>; // Raw payload sent by the frontend
type CreateSLOParams = t.TypeOf<typeof createSLOParamsSchema.props.body>; // Parsed payload used by the backend
type CreateSLOResponse = t.TypeOf<typeof createSLOResponseSchema>; // Raw response sent to the frontend

type GetSLOParams = t.TypeOf<typeof getSLOQuerySchema.props.query>;
type GetSLOResponse = t.OutputOf<typeof getSLOResponseSchema>;

type ManageSLOParams = t.TypeOf<typeof manageSLOParamsSchema.props.path>;

type ResetSLOParams = t.TypeOf<typeof resetSLOParamsSchema.props.path>;
type ResetSLOResponse = t.OutputOf<typeof resetSLOResponseSchema>;

type UpdateSLOInput = t.OutputOf<typeof updateSLOParamsSchema.props.body>;
type UpdateSLOParams = t.TypeOf<typeof updateSLOParamsSchema.props.body>;
type UpdateSLOResponse = t.OutputOf<typeof updateSLOResponseSchema>;

type FindSLOParams = t.TypeOf<typeof findSLOParamsSchema.props.query>;
type FindSLOResponse = t.OutputOf<typeof findSLOResponseSchema>;

type FindSLOGroupsParams = t.TypeOf<typeof findSLOGroupsParamsSchema.props.query>;
type FindSLOGroupsResponse = t.OutputOf<typeof findSLOGroupsResponseSchema>;

type DeleteSLOInstancesInput = t.OutputOf<typeof deleteSLOInstancesParamsSchema.props.body>;
type DeleteSLOInstancesParams = t.TypeOf<typeof deleteSLOInstancesParamsSchema.props.body>;

type FetchHistoricalSummaryParams = t.TypeOf<typeof fetchHistoricalSummaryParamsSchema.props.body>;
type FetchHistoricalSummaryResponse = t.OutputOf<typeof fetchHistoricalSummaryResponseSchema>;
type HistoricalSummaryResponse = t.OutputOf<typeof historicalSummarySchema>;

type FindSLODefinitionsParams = t.TypeOf<typeof findSloDefinitionsParamsSchema.props.query>;
type FindSLODefinitionsResponse = t.OutputOf<typeof findSloDefinitionsResponseSchema>;

type GetPreviewDataParams = t.TypeOf<typeof getPreviewDataParamsSchema.props.body>;
type GetPreviewDataResponse = t.OutputOf<typeof getPreviewDataResponseSchema>;

type GetSLOInstancesResponse = t.OutputOf<typeof getSLOInstancesResponseSchema>;

type GetSLOBurnRatesResponse = t.OutputOf<typeof getSLOBurnRatesResponseSchema>;
type BudgetingMethod = t.OutputOf<typeof budgetingMethodSchema>;
type TimeWindow = t.OutputOf<typeof timeWindowTypeSchema>;
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
  createSLOParamsSchema,
  deleteSLOParamsSchema,
  deleteSLOInstancesParamsSchema,
  findSLOParamsSchema,
  findSLOResponseSchema,
  findSLOGroupsParamsSchema,
  findSLOGroupsResponseSchema,
  getPreviewDataParamsSchema,
  getPreviewDataResponseSchema,
  getSLOParamsSchema,
  getSLOResponseSchema,
  fetchHistoricalSummaryParamsSchema,
  fetchHistoricalSummaryResponseSchema,
  findSloDefinitionsParamsSchema,
  findSloDefinitionsResponseSchema,
  manageSLOParamsSchema,
  resetSLOParamsSchema,
  resetSLOResponseSchema,
  sloResponseSchema,
  sloWithSummaryResponseSchema,
  sloGroupWithSummaryResponseSchema,
  updateSLOParamsSchema,
  updateSLOResponseSchema,
  getSLOBurnRatesParamsSchema,
  getSLOBurnRatesResponseSchema,
  getSLOInstancesParamsSchema,
  getSLOInstancesResponseSchema,
};
export type {
  BudgetingMethod,
  CreateSLOInput,
  CreateSLOParams,
  CreateSLOResponse,
  DeleteSLOInstancesInput,
  DeleteSLOInstancesParams,
  FindSLOParams,
  FindSLOResponse,
  FindSLOGroupsParams,
  FindSLOGroupsResponse,
  GetPreviewDataParams,
  GetPreviewDataResponse,
  GetSLOParams,
  GetSLOResponse,
  FetchHistoricalSummaryParams,
  FetchHistoricalSummaryResponse,
  HistoricalSummaryResponse,
  FindSLODefinitionsParams,
  FindSLODefinitionsResponse,
  ManageSLOParams,
  ResetSLOParams,
  ResetSLOResponse,
  SLOResponse,
  SLOWithSummaryResponse,
  SLOGroupWithSummaryResponse,
  UpdateSLOInput,
  UpdateSLOParams,
  UpdateSLOResponse,
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
  GroupSummary,
  KqlWithFiltersSchema,
  QuerySchema,
};
