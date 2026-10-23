/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Validation contract shared by the io-ts schemas and their zod twins during
 * the zod migration: both flavors must accept/reject the same inputs with the
 * same messages, so the bounds and messages live here exactly once.
 */

export const MIN_SLO_ID_LENGTH = 8;
export const MAX_SLO_ID_LENGTH = 48;
export const SLO_ID_REGEX = /^[a-z0-9-_]+$/;
export const SLO_ID_INVALID_MESSAGE =
  'Invalid slo id, must be between 8 and 48 characters and contain only letters, numbers, hyphens, and underscores';

// A `snapshot` project routing encodes every selected project id, so the bound scales with
// the number of linked projects rather than with the number of exclusions.
export const MAX_PROJECT_ROUTINGS_LENGTH = 8192;
export const PROJECT_ROUTINGS_EMPTY_MESSAGE = 'Invalid projectRoutings, must not be empty';
export const PROJECT_ROUTINGS_TOO_LONG_MESSAGE = `Invalid projectRoutings, must be at most ${MAX_PROJECT_ROUTINGS_LENGTH} characters`;
