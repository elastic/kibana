/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RELATIONSHIP_KI_TYPE } from './dreaming';

export const MEMORY_KI_TYPES = ['memory.session', 'memory.session_fact'] as const;

/** The memory KI types left out of ordinary retrieval: memories, and dreamed relationships. */
export const RETRIEVAL_EXCLUDED_MEMORY_KI_TYPES: readonly string[] = [
  ...MEMORY_KI_TYPES,
  RELATIONSHIP_KI_TYPE,
];
