/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type { ruleHealthRequestBodySchemaV1, ruleHealthResponseBodySchemaV1 } from '..';

export type RuleHealthRequestBody = TypeOf<typeof ruleHealthRequestBodySchemaV1>;
export type RuleHealthResponseBody = TypeOf<typeof ruleHealthResponseBodySchemaV1>;

export interface RuleHealthResponse {
  body: RuleHealthResponseBody;
}
