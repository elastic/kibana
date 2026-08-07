/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Minimum normalized score for a semantic-only hit to be returned. */
export const MEMORY_SEMANTIC_MIN_SCORE = 0.15;

/** Rank constant used when fusing keyword and semantic results with RRF. */
export const MEMORY_RRF_RANK_CONSTANT = 20;
