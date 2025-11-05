/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Custom enum of entity field operations
 */
export const ML_ENTITY_FIELD_OPERATIONS = {
  ADD: '+',
  REMOVE: '-',
} as const;

/**
 * Union type of entity field operations
 */
export type MlEntityFieldOperation =
  (typeof ML_ENTITY_FIELD_OPERATIONS)[keyof typeof ML_ENTITY_FIELD_OPERATIONS];
