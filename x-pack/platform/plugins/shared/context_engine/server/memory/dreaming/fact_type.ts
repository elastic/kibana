/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MEMORY_ATTRIBUTES } from '../../../common/memory';
import type { LongTermMemoryTypeDefinition } from './long_term_types';
import {
  SHARED_DREAM_OPERATIONS,
  VERIFICATION_DREAM_OPERATIONS,
  prepareWithModelKey,
  withVerification,
} from './long_term_types';

export const FACT_MEMORY_TYPE: LongTermMemoryTypeDefinition = {
  type: 'memory.fact',
  label: 'facts',
  instructions: [
    'A fact is a single statement about this environment that stays true no matter who asked or when, such as how a system behaves, what a field means, or a team convention.',
    'A fact must stand on its own: someone reading only the fact must understand it without the session it came from.',
    'Do not record personal details, individual user preferences, or one-off events as facts.',
    'Do not record a step-by-step workflow as a fact; workflows are procedures.',
    'Use `create` for a new fact. Set `key` to a short, stable, lowercase identifier of what the fact is about, for example `orders-index.timestamp-field`.',
    'Use `reinforce` when a session repeats an existing fact.',
    'Use `supersede` when a session shows an existing fact has changed; give the full new fact.',
    'Use `outdate` when a fact no longer applies and nothing replaces it.',
    'Use `confirm` when a session verified an existing fact, for example by running a query that proved it.',
    'Use `refute` when a session proved an existing fact was never true.',
  ].join('\n'),
  operations: [...SHARED_DREAM_OPERATIONS, ...VERIFICATION_DREAM_OPERATIONS],
  prepare: prepareWithModelKey,
  ...withVerification({
    status: MEMORY_ATTRIBUTES.factVerificationStatus,
    updatedAt: MEMORY_ATTRIBUTES.factVerificationUpdatedAt,
    by: MEMORY_ATTRIBUTES.factVerificationBy,
  }),
};
