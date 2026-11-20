/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const HIGH_CARDINALITY_THRESHOLD = 10000;
export const DEFAULT_MAX_SUGGESTIONS = 5;
export const DEFAULT_TIME_RANGE_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_REVISION_ATTEMPTS = 3;
// Extra candidates are requested because some will not survive validation.
export const EXTRA_CANDIDATES = 2;
// Job validation warns about more than three influencers.
export const MAX_INFLUENCERS = 3;
