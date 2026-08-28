/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  nightshiftInvestigationSavedObjectType,
  NIGHTSHIFT_INVESTIGATION_SO_TYPE,
  MAX_KEYWORD_LENGTH,
} from './investigation_saved_object';
export type { NightshiftInvestigationAttributes } from './investigation_saved_object';
export { InvestigationSavedObjectClient } from './investigation_saved_object_client';
export type {
  InvestigationStructuredOutput,
  InvestigationSavedObjectUpdateAttributes,
  FindInvestigationsOptions,
  FindInvestigationsResult,
} from './investigation_saved_object_client';
