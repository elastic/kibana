/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { sloIdSchema } from '../../schema/slo';
import { allOrAnyString, dateType, errorBudgetSchema, statusSchema } from '../../schema/common';

const getSLOTimeseriesParamsSchema = t.type({
  path: t.type({
    id: sloIdSchema,
  }),
  query: t.intersection([
    t.type({
      from: dateType,
      to: dateType,
    }),
    t.partial({
      instanceId: allOrAnyString,
      remoteName: t.string,
      bucketInterval: t.string,
      includeRaw: t.union([t.literal('true'), t.literal('false')]),
    }),
  ]),
});

const timeseriesDataPointSchema = t.intersection([
  t.type({
    date: dateType,
    sliValue: t.number,
    status: statusSchema,
    errorBudget: errorBudgetSchema,
  }),
  t.partial({
    numerator: t.number,
    denominator: t.number,
  }),
]);

const getSLOTimeseriesResponseSchema = t.type({
  sloId: sloIdSchema,
  instanceId: allOrAnyString,
  dataPoints: t.array(timeseriesDataPointSchema),
});

type GetSLOTimeseriesParams = t.TypeOf<typeof getSLOTimeseriesParamsSchema>;
type GetSLOTimeseriesResponse = t.OutputOf<typeof getSLOTimeseriesResponseSchema>;

export { getSLOTimeseriesParamsSchema, getSLOTimeseriesResponseSchema };
export type { GetSLOTimeseriesParams, GetSLOTimeseriesResponse };
