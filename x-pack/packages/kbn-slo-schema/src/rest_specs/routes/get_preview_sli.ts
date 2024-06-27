/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { indicatorSchema, timeWindowSchema } from '../../schema';

const getPreviewSLIParamsSchema = t.type({
  body: t.type({
    indicator: indicatorSchema,
    timeWindow: timeWindowSchema,
  }),
});

const getPreviewSLIResponseSchema = t.type({
  sliValue: t.union([t.number, t.null]),
});

type GetPreviewSLIParams = t.TypeOf<typeof getPreviewSLIParamsSchema.props.body>;
type GetPreviewSLIResponse = t.OutputOf<typeof getPreviewSLIResponseSchema>;

export { getPreviewSLIParamsSchema, getPreviewSLIResponseSchema };
export type { GetPreviewSLIParams, GetPreviewSLIResponse };
