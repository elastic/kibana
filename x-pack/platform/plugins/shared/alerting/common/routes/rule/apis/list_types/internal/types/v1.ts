/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import type {
  getRuleTypesInternalResponseSchemaV1,
  getRuleTypesInternalResponseBodySchemaV1,
} from '..';

export type GetRuleTypesInternalResponse = TypeOf<typeof getRuleTypesInternalResponseSchemaV1>;
export type GetRuleTypesInternalResponseBody = TypeOf<
  typeof getRuleTypesInternalResponseBodySchemaV1
>;
