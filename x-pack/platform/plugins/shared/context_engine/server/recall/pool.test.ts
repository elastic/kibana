/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedRecallInclude, RecallAiIndexSelector } from './include';
import { allocateCandidatePool } from './pool';

const NONE: RecallAiIndexSelector = { kind: 'none' };
const ALL: RecallAiIndexSelector = { kind: 'all' };
const IDS: RecallAiIndexSelector = { kind: 'ids', ids: ['docs', 'runbooks'] };

const include = (
  sessionEvents: boolean,
  sessionMemory: boolean,
  aiIndices: RecallAiIndexSelector
): ParsedRecallInclude => ({ sessionEvents, sessionMemory, aiIndices });

describe('allocateCandidatePool', () => {
  it.each([
    ['session_events', include(true, false, NONE), [100, 0, 0]],
    ['session_memory', include(false, true, NONE), [0, 100, 0]],
    ['ai_index:*', include(false, false, ALL), [0, 0, 100]],
    ['ai_index:<ids>', include(false, false, IDS), [0, 0, 100]],
    ['session_events + session_memory', include(true, true, NONE), [50, 50, 0]],
    ['session_events + ai_index:*', include(true, false, ALL), [33, 0, 67]],
    ['session_events + ai_index:<ids>', include(true, false, IDS), [33, 0, 67]],
    ['session_memory + ai_index:*', include(false, true, ALL), [0, 33, 67]],
    ['session_memory + ai_index:<ids>', include(false, true, IDS), [0, 33, 67]],
    ['all three', include(true, true, ALL), [25, 25, 50]],
    ['all three with ids', include(true, true, IDS), [25, 25, 50]],
  ])('splits the pool for %s', (_label, parsed, [sessionEvents, sessionMemory, aiIndices]) => {
    const allocation = allocateCandidatePool(parsed);
    expect(allocation).toEqual({ sessionEvents, sessionMemory, aiIndices });
    expect(allocation.sessionEvents + allocation.sessionMemory + allocation.aiIndices).toBe(100);
  });

  it('allocates nothing when no store is active', () => {
    expect(allocateCandidatePool(include(false, false, NONE))).toEqual({
      sessionEvents: 0,
      sessionMemory: 0,
      aiIndices: 0,
    });
  });
});
