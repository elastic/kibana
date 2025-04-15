/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { typesRulesResponseSchema, typesRulesResponseBodySchema } from './schemas/latest';
export type { TypesRulesResponse, TypesRulesResponseBody } from './types/latest';

export {
  typesRulesResponseSchema as typesRulesResponseSchemaV1,
  typesRulesResponseBodySchema as typesRulesResponseBodySchemaV1,
} from './schemas/v1';
export type {
  TypesRulesResponse as TypesRulesResponseV1,
  TypesRulesResponseBody as TypesRulesResponseBodyV1,
} from './types/v1';
