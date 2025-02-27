/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  addCombinedFieldsToPipeline,
  addCombinedFieldsToMappings,
  getDefaultCombinedFields,
} from './utils';

export { CombinedFieldsReadOnlyForm } from './combined_fields_read_only_form';
export { CombinedFieldsForm } from './combined_fields_form';
export type { CombinedField } from './types';
