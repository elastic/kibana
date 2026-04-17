/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { sloIdSchema } from '../../../schema/slo';
import { historicalSummarySchema } from '../fetch_historical_summary';

const fetchCompositeHistoricalSummaryParamsSchema = t.type({
  body: t.type({
    list: t.array(sloIdSchema),
  }),
});

const fetchCompositeHistoricalSummaryResponseSchema = t.array(
  t.type({
    compositeId: sloIdSchema,
    data: t.array(historicalSummarySchema),
  })
);

type FetchCompositeHistoricalSummaryParams = t.TypeOf<
  typeof fetchCompositeHistoricalSummaryParamsSchema.props.body
>;
type FetchCompositeHistoricalSummaryResponse = t.OutputOf<
  typeof fetchCompositeHistoricalSummaryResponseSchema
>;

export {
  fetchCompositeHistoricalSummaryParamsSchema,
  fetchCompositeHistoricalSummaryResponseSchema,
};
export type { FetchCompositeHistoricalSummaryParams, FetchCompositeHistoricalSummaryResponse };
