/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { getParamsSchemaV1, getResponseSchemaV1 } from '..';

export type GetBackfillRequestParams = TypeOf<typeof getParamsSchemaV1>;
export type GetBackfillResponseBody = TypeOf<typeof getResponseSchemaV1>;

export interface GetBackfillResponse {
  body: GetBackfillResponseBody;
}
