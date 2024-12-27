/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { getRulesWithGapQuerySchemaV1, getRulesWithGapResponseSchemaV1 } from '..';

export type GetRulesWithGapQuery = TypeOf<typeof getRulesWithGapQuerySchemaV1>;
export type GetRulesWithGapResponseBody = TypeOf<typeof getRulesWithGapResponseSchemaV1>;

export interface GetRulesWithGapResponse {
  body: GetRulesWithGapResponseBody;
}
