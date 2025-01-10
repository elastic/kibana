/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { findQuerySchemaV1, findResponseSchemaV1 } from '..';

export type FindGapsRequestQuery = TypeOf<typeof findQuerySchemaV1>;
export type FindGapsResponseBody = TypeOf<typeof findResponseSchemaV1>;

export interface FindGapsResponse {
  body: FindGapsResponseBody;
}
