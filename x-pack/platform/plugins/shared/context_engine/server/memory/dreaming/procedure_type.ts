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

export const PROCEDURE_MEMORY_TYPE: LongTermMemoryTypeDefinition = {
  type: 'memory.procedure',
  label: 'procedures',
  instructions: [
    'A procedure is a reusable, step-by-step workflow for a task that comes up again in this environment, which an agent learned or was given in a session.',
    'Only record workflows with several steps toward a goal. A single statement is a fact, and a sequence that only made sense once is not a procedure.',
    'The steps must work for someone who was not in the session: name the concrete tools, queries, indices or settings used.',
    'Set `title` to the task, for example "Roll over the orders data stream". Set `description` to when to use the procedure. Set `content` to the numbered steps.',
    'Use `create` for a new procedure. Set `key` to a short, stable, lowercase identifier of the task, for example `orders-data-stream.rollover`.',
    'Use `reinforce` when a session followed or repeated an existing procedure without changing it.',
    'Use `supersede` when a session improved or corrected the steps; give the full new procedure.',
    'Use `outdate` when a procedure no longer applies and nothing replaces it.',
    'Use `confirm` when a session followed an existing procedure and it worked.',
    'Use `refute` when a session showed an existing procedure does not work.',
  ].join('\n'),
  operations: [...SHARED_DREAM_OPERATIONS, ...VERIFICATION_DREAM_OPERATIONS],
  prepare: prepareWithModelKey,
  ...withVerification({
    status: MEMORY_ATTRIBUTES.procedureVerificationStatus,
    updatedAt: MEMORY_ATTRIBUTES.procedureVerificationUpdatedAt,
    by: MEMORY_ATTRIBUTES.procedureVerificationBy,
  }),
};
