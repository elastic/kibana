/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { actionSchema, previewBodySchema } from './schemas/latest';

export type {
  PreviewRuleAction,
  PreviewRuleRequestBody,
  PreviewRuleResponse,
} from './types/latest';

export {
  actionSchema as actionSchemaV1,
  previewBodySchema as previewBodySchemaV1,
} from './schemas/v1';

export type {
  PreviewRuleAction as PreviewRuleActionV1,
  PreviewRuleRequestBody as PreviewRuleRequestBodyV1,
  PreviewRuleResponse as PreviewRuleResponseV1,
} from './types/v1';
