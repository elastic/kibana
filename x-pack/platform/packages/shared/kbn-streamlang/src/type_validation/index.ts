/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { validateTypes } from './validate_types';
export type { TypeAssumption, PrimitiveType, TypeofPlaceholder, FieldType } from './types';
export { ConditionalTypeChangeError } from './errors';
export { AssumptionConflictError } from './assumption_conflict_error';
