/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';

const aggregateSLOParamsSchema = t.type({
  body: t.intersection([
    t.type({
      groupBy: t.string,
    }),
    t.partial({
      filter: t.partial({
        metadata: t.record(t.string, t.string),
        kqlQuery: t.string,
        status: t.array(t.string),
      }),
      size: t.number,
    }),
  ]),
});

const aggregateSLOGroupSchema = t.type({
  key: t.string,
  count: t.number,
  avgSliValue: t.number,
  avgErrorBudgetConsumed: t.number,
});

const aggregateSLOResponseSchema = t.type({
  groups: t.array(aggregateSLOGroupSchema),
});

type AggregateSLOParams = t.TypeOf<typeof aggregateSLOParamsSchema.props.body>;
type AggregateSLOResponse = t.OutputOf<typeof aggregateSLOResponseSchema>;

export { aggregateSLOParamsSchema, aggregateSLOResponseSchema };
export type { AggregateSLOParams, AggregateSLOResponse };
