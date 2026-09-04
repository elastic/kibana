/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';

import { serverlessSloSettingsSchema, sloSettingsSchema } from '../../schema/zod/settings';

const putSLOSettingsParamsSchema = z.object({
  body: sloSettingsSchema,
});

const putSLOServerlessSettingsParamsSchema = z.object({
  body: serverlessSloSettingsSchema,
});

const putSLOSettingsResponseSchema = sloSettingsSchema;

type PutSLOSettingsParams = z.output<typeof putSLOSettingsParamsSchema.shape.body>;
type PutServerlessSLOSettingsParams = z.output<
  typeof putSLOServerlessSettingsParamsSchema.shape.body
>;
type PutSLOSettingsResponse = z.output<typeof putSLOSettingsResponseSchema>;
type GetSLOSettingsResponse = z.output<typeof sloSettingsSchema>;

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
