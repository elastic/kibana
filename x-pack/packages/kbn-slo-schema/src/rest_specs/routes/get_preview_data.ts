/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { indicatorSchema, objectiveSchema } from '../../schema';
import { dateType } from '../../schema/common';

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

const getPreviewDataResponseSchema = t.array(
  t.intersection([
    t.type({
      date: dateType,
      sliValue: t.number,
    }),
    t.partial({
      events: t.type({
        good: t.number,
        bad: t.number,
        total: t.number,
      }),
    }),
  ])
);

type GetPreviewDataParams = t.TypeOf<typeof getPreviewDataParamsSchema.props.body>;
type GetPreviewDataResponse = t.OutputOf<typeof getPreviewDataResponseSchema>;

export { getPreviewDataParamsSchema, getPreviewDataResponseSchema };
export type { GetPreviewDataParams, GetPreviewDataResponse };
