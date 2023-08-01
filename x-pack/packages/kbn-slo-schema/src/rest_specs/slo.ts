/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import {
  apmTransactionDurationIndicatorSchema,
  apmTransactionErrorRateIndicatorSchema,
  budgetingMethodSchema,
  dateType,
  durationType,
  histogramIndicatorSchema,
  historicalSummarySchema,
  indicatorSchema,
  indicatorTypesSchema,
  kqlCustomIndicatorSchema,
  metricCustomIndicatorSchema,
  objectiveSchema,
  optionalSettingsSchema,
  previewDataSchema,
  settingsSchema,
  sloIdSchema,
  summarySchema,
  tagsSchema,
  timeWindowSchema,
  timeWindowTypeSchema,
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
    t.partial({ id: sloIdSchema, settings: optionalSettingsSchema, tags: tagsSchema }),
  ]),
});

const createSLOResponseSchema = t.type({
  id: sloIdSchema,
});

const getPreviewDataParamsSchema = t.type({
  body: t.type({
    indicator: indicatorSchema,
  }),
});

const getPreviewDataResponseSchema = t.array(previewDataSchema);

const deleteSLOParamsSchema = t.type({
  path: t.type({
    id: sloIdSchema,
  }),
});

const getSLOParamsSchema = t.type({
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
    kqlQuery: t.string,
    page: t.string,
    perPage: t.string,
    sortBy: sortBySchema,
    sortDirection: sortDirectionSchema,
  }),
});

const sloResponseSchema = t.type({
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
  createdAt: dateType,
  updatedAt: dateType,
});

const sloWithSummaryResponseSchema = t.intersection([
  sloResponseSchema,
  t.type({ summary: summarySchema }),
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
  }),
});

const manageSLOParamsSchema = t.type({
  path: t.type({ id: sloIdSchema }),
});

const updateSLOResponseSchema = sloResponseSchema;

const findSLOResponseSchema = t.type({
  page: t.number,
  perPage: t.number,
  total: t.number,
  results: t.array(sloWithSummaryResponseSchema),
});

const fetchHistoricalSummaryParamsSchema = t.type({
  body: t.type({ sloIds: t.array(sloIdSchema) }),
});
const fetchHistoricalSummaryResponseSchema = t.record(
  sloIdSchema,
  t.array(historicalSummarySchema)
);

const getSLODiagnosisParamsSchema = t.type({
  path: t.type({ id: t.string }),
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
    windows: t.array(
      t.type({
        name: t.string,
        duration: durationType,
      })
    ),
  }),
});

type SLOResponse = t.OutputOf<typeof sloResponseSchema>;
type SLOWithSummaryResponse = t.OutputOf<typeof sloWithSummaryResponseSchema>;

type CreateSLOInput = t.OutputOf<typeof createSLOParamsSchema.props.body>; // Raw payload sent by the frontend
type CreateSLOParams = t.TypeOf<typeof createSLOParamsSchema.props.body>; // Parsed payload used by the backend
type CreateSLOResponse = t.TypeOf<typeof createSLOResponseSchema>; // Raw response sent to the frontend

type GetSLOResponse = t.OutputOf<typeof getSLOResponseSchema>;

type ManageSLOParams = t.TypeOf<typeof manageSLOParamsSchema.props.path>;

type UpdateSLOInput = t.OutputOf<typeof updateSLOParamsSchema.props.body>;
type UpdateSLOParams = t.TypeOf<typeof updateSLOParamsSchema.props.body>;
type UpdateSLOResponse = t.OutputOf<typeof updateSLOResponseSchema>;

type FindSLOParams = t.TypeOf<typeof findSLOParamsSchema.props.query>;
type FindSLOResponse = t.OutputOf<typeof findSLOResponseSchema>;

type FetchHistoricalSummaryParams = t.TypeOf<typeof fetchHistoricalSummaryParamsSchema.props.body>;
type FetchHistoricalSummaryResponse = t.OutputOf<typeof fetchHistoricalSummaryResponseSchema>;
type HistoricalSummaryResponse = t.OutputOf<typeof historicalSummarySchema>;

type GetPreviewDataParams = t.TypeOf<typeof getPreviewDataParamsSchema.props.body>;
type GetPreviewDataResponse = t.OutputOf<typeof getPreviewDataResponseSchema>;

type GetSLOBurnRatesResponse = t.OutputOf<typeof getSLOBurnRatesResponseSchema>;
type BudgetingMethod = t.OutputOf<typeof budgetingMethodSchema>;
type TimeWindow = t.OutputOf<typeof timeWindowTypeSchema>;
type IndicatorType = t.OutputOf<typeof indicatorTypesSchema>;
type Indicator = t.OutputOf<typeof indicatorSchema>;
type APMTransactionErrorRateIndicator = t.OutputOf<typeof apmTransactionErrorRateIndicatorSchema>;
type APMTransactionDurationIndicator = t.OutputOf<typeof apmTransactionDurationIndicatorSchema>;
type MetricCustomIndicator = t.OutputOf<typeof metricCustomIndicatorSchema>;
type HistogramIndicator = t.OutputOf<typeof histogramIndicatorSchema>;
type KQLCustomIndicator = t.OutputOf<typeof kqlCustomIndicatorSchema>;

export {
  createSLOParamsSchema,
  deleteSLOParamsSchema,
  findSLOParamsSchema,
  findSLOResponseSchema,
  getPreviewDataParamsSchema,
  getPreviewDataResponseSchema,
  getSLODiagnosisParamsSchema,
  getSLOParamsSchema,
  getSLOResponseSchema,
  fetchHistoricalSummaryParamsSchema,
  fetchHistoricalSummaryResponseSchema,
  manageSLOParamsSchema,
  sloResponseSchema,
  sloWithSummaryResponseSchema,
  updateSLOParamsSchema,
  updateSLOResponseSchema,
  getSLOBurnRatesParamsSchema,
  getSLOBurnRatesResponseSchema,
};
export type {
  BudgetingMethod,
  CreateSLOInput,
  CreateSLOParams,
  CreateSLOResponse,
  FindSLOParams,
  FindSLOResponse,
  GetPreviewDataParams,
  GetPreviewDataResponse,
  GetSLOResponse,
  FetchHistoricalSummaryParams,
  FetchHistoricalSummaryResponse,
  HistoricalSummaryResponse,
  ManageSLOParams,
  SLOResponse,
  SLOWithSummaryResponse,
  UpdateSLOInput,
  UpdateSLOParams,
  UpdateSLOResponse,
  APMTransactionDurationIndicator,
  APMTransactionErrorRateIndicator,
  GetSLOBurnRatesResponse,
  IndicatorType,
  Indicator,
  MetricCustomIndicator,
  HistogramIndicator,
  KQLCustomIndicator,
  TimeWindow,
};
