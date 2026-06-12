/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { serverlessSloSettingsSchema, sloSettingsSchema } from '../../schema/settings';

const putSLOSettingsParamsSchema = t.type({
  body: sloSettingsSchema,
});

const putSLOServerlessSettingsParamsSchema = t.type({
  body: serverlessSloSettingsSchema,
});

const putSLOSettingsResponseSchema = sloSettingsSchema;

type PutSLOSettingsParams = t.TypeOf<typeof putSLOSettingsParamsSchema.props.body>;
type PutServerlessSLOSettingsParams = t.TypeOf<
  typeof putSLOServerlessSettingsParamsSchema.props.body
>;
type PutSLOSettingsResponse = t.OutputOf<typeof putSLOSettingsResponseSchema>;
type GetSLOSettingsResponse = t.OutputOf<typeof sloSettingsSchema>;

export {
  putSLOServerlessSettingsParamsSchema,
  putSLOSettingsParamsSchema,
  putSLOSettingsResponseSchema,
};
export type {
  GetSLOSettingsResponse,
  PutServerlessSLOSettingsParams,
  PutSLOSettingsParams,
  PutSLOSettingsResponse,
};
