/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FleetError } from '../errors';

const UNSAFE_IDS = new Set(['__proto__', 'constructor', 'prototype']);
const HUMAN_READABLE_ID_MAX_LENGTH = 255;

const isUnsafeId = (id: string): boolean =>
  UNSAFE_IDS.has(id) ||
  id.length === 0 ||
  id.length > HUMAN_READABLE_ID_MAX_LENGTH ||
  id.includes('..') ||
  id.includes('/');

/**
 * Throws a FleetError if the id contains path separators, traversal sequences,
 * prototype-pollution keys, is empty, or exceeds 255 characters. Only call on
 * create paths so pre-existing stored IDs continue to function.
 */
export const validateFleetSavedObjectId = (value: string | undefined): void => {
  if (value === undefined || !isUnsafeId(value)) return;
  throw new FleetError(
    `id is not valid: must be 1–255 characters and must not contain path separators ("/"), traversal sequences (".."), or reserved keys ("__proto__", "constructor", "prototype").`
  );
};
