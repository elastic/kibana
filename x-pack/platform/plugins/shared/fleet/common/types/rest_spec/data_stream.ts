/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { type TypeOf, schema } from '@kbn/config-schema';

import type { DataStream } from '../models';

export interface GetDataStreamsResponse {
  data_streams: DataStream[];
}
export const DeprecatedILMPolicyCheckResponseSchema = schema.object({
  deprecatedILMPolicies: schema.arrayOf(
    schema.object({
      policyName: schema.string(),
      version: schema.number(),
      componentTemplates: schema.arrayOf(schema.string(), { maxSize: 10000 }),
    }),
    { maxSize: 3 }
  ),
});
export type DeprecatedILMPolicyCheckResponse = TypeOf<
  typeof DeprecatedILMPolicyCheckResponseSchema
>;
