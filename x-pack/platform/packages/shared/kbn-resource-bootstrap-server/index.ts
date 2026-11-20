/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  ApplyContext,
  ApplyError,
  ApplyResult,
  GlobalApplyContext,
  JsonValue,
  OwnershipContext,
  RemoveResult,
  ResourceKind,
  ResourceOwnership,
  ResourceSpaceSupport,
  StoredVersion,
} from './src/types';
export { applyEach } from './src/apply_each';
export type { ApplyErrorDetails } from './src/apply_each';
export { toApplyError } from './src/to_apply_error';
export { createSavedObjectOwnership, NO_ATTRIBUTES } from './src/saved_object_ownership';
