/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CUSTOM_FIELD_KEY_PREFIX = 'cf_';
/** Prefix for Field Library (v2) filter keys in the More Filters map — avoids collisions with system/`cf_` keys. */
export const EXTENDED_FIELD_KEY_PREFIX = 'ef_';
export const ALL_CASES_STATE_URL_KEY = 'cases';

export const LEGACY_SUPPORTED_STATE_KEYS = [
  'status',
  'severity',
  'page',
  'perPage',
  'sortField',
  'sortOrder',
] as const;
