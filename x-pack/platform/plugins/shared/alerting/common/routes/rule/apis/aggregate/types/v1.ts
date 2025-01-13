/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { aggregateRulesRequestBodySchemaV1, aggregateRulesResponseBodySchemaV1 } from '..';

export type AggregateRulesRequestBody = TypeOf<typeof aggregateRulesRequestBodySchemaV1>;
export type AggregateRulesResponseBody = TypeOf<typeof aggregateRulesResponseBodySchemaV1>;

export interface AggregateRulesResponse {
  body: AggregateRulesResponseBody;
}
