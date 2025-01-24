/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { getRuleIdsWithGapQuerySchemaV1, getRuleIdsWithGapResponseSchemaV1 } from '..';

export type GetRuleIdsWithGapQuery = TypeOf<typeof getRuleIdsWithGapQuerySchemaV1>;
export type GetRuleIdsWithGapResponseBody = TypeOf<typeof getRuleIdsWithGapResponseSchemaV1>;

export interface GetRuleIdsWithGapResponse {
  body: GetRuleIdsWithGapResponseBody;
}
