/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { findGapsBodySchemaV1, findGapsResponseSchemaV1 } from '..';

export type FindGapsRequestBody = TypeOf<typeof findGapsBodySchemaV1>;
export type FindGapsResponseBody = TypeOf<typeof findGapsResponseSchemaV1>;

export interface FindGapsResponse {
  body: FindGapsResponseBody;
}
