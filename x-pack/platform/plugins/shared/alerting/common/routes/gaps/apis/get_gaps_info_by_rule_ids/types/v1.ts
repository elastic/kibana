/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { getGapsInfoByRuleIdsQuerySchema, getGapsInfoByRuleIdsResponseSchema } from '..';

export type GetGapsInfoByRuleIdsQuery = TypeOf<typeof getGapsInfoByRuleIdsQuerySchema>;
export type GetGapsInfoByRuleIdsResponseBody = TypeOf<typeof getGapsInfoByRuleIdsResponseSchema>;

export interface GetGapsInfoByRuleIdsResponse {
  body: GetGapsInfoByRuleIdsResponseBody;
}
