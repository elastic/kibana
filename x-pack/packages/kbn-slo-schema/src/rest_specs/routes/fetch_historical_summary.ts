/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import {
  budgetingMethodSchema,
  objectiveSchema,
  sloIdSchema,
  timeWindowSchema,
} from '../../schema';
import {
  allOrAnyString,
  allOrAnyStringOrArray,
  dateType,
  summarySchema,
} from '../../schema/common';

// TODO Kevin: Check if we can remove the extra parameters and find the remote SLO from indices
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

const historicalSummarySchema = t.intersection([
  t.type({
    date: dateType,
  }),
  summarySchema,
]);

const fetchHistoricalSummaryResponseSchema = t.array(
  t.type({
    sloId: sloIdSchema,
    instanceId: allOrAnyString,
    data: t.array(historicalSummarySchema),
  })
);

type FetchHistoricalSummaryParams = t.TypeOf<typeof fetchHistoricalSummaryParamsSchema.props.body>;
type FetchHistoricalSummaryResponse = t.OutputOf<typeof fetchHistoricalSummaryResponseSchema>;
type HistoricalSummaryResponse = t.OutputOf<typeof historicalSummarySchema>;

export {
  fetchHistoricalSummaryParamsSchema,
  fetchHistoricalSummaryResponseSchema,
  historicalSummarySchema,
};
export type {
  FetchHistoricalSummaryParams,
  FetchHistoricalSummaryResponse,
  HistoricalSummaryResponse,
};
