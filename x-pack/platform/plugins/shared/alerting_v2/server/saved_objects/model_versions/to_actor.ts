/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Wraps a legacy `createdBy` / `updatedBy` profile UID string into the structured
 * actor object. Returns `undefined` for anything else so callers can omit the
 * attribute and leave the stored value untouched: `null` actors (unattributed
 * writes) stay `null`, and already-migrated actors are not flattened.
 */
export const toActor = (value: unknown): { profile_uid: string } | undefined =>
  typeof value === 'string' ? { profile_uid: value } : undefined;
