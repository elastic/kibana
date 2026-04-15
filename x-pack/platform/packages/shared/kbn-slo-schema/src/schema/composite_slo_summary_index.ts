/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { statusSchema } from './common';

/**
 * Flat summary fields persisted on composite summary index documents (see task `buildSummaryDoc`).
 * Other top-level keys (`spaceId`, `summaryUpdatedAt`, `compositeSlo`, …) are ignored by decode.
 */
const compositeSloSummaryIndexSummaryFieldsSchema = t.type({
  sliValue: t.number,
  status: statusSchema,
  errorBudgetInitial: t.number,
  errorBudgetConsumed: t.number,
  errorBudgetRemaining: t.number,
  errorBudgetIsEstimated: t.boolean,
  fiveMinuteBurnRate: t.number,
  oneHourBurnRate: t.number,
  oneDayBurnRate: t.number,
});

type CompositeSloSummaryIndexSummaryFields = t.OutputOf<
  typeof compositeSloSummaryIndexSummaryFieldsSchema
>;

export { compositeSloSummaryIndexSummaryFieldsSchema };
export type { CompositeSloSummaryIndexSummaryFields };
