/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_KI_REFERENCES } from '../../common/step_types/ki';
import { isKiDeleted } from '../ai_indices/ki_revision';
import { isPersonEdited } from '../ai_indices/ki_write';
import { citedMemoryIds, type DreamedKi } from '../dreaming/dreamed_ki';
import { TRACE_ROUND_ID_PREFIX } from '../dreaming/ids';

/** What maintenance does about the memories an item came from. */
export type SourceVerdict =
  | { verdict: 'intact' }
  | { verdict: 'tombstone'; reason: string }
  | { verdict: 'needs_review'; reason: string }
  | { verdict: 'rewrite'; lostIds: string[]; remainingIds: string[] };

const isTraceRound = (memoryId: string): boolean => memoryId.startsWith(TRACE_ROUND_ID_PREFIX);

/** The memory KIs an item cites; trace rounds are left out, as they are never deleted. */
export const citedMemoryKiIds = (ki: DreamedKi): string[] =>
  citedMemoryIds(ki).filter((memoryId) => !isTraceRound(memoryId));

/**
 * Whether an item lost the memories it came from, and what to do about it. A trace round always
 * counts as present. A memory missing from the AI index counts as deleted.
 */
export const sourceVerdictOf = (
  ki: DreamedKi,
  memories: ReadonlyMap<string, DreamedKi>
): SourceVerdict => {
  const cited = citedMemoryIds(ki);
  const memoryIds = cited.filter((memoryId) => !isTraceRound(memoryId));
  const lostIds = memoryIds.filter((memoryId) => {
    const memory = memories.get(memoryId);
    return memory === undefined || isKiDeleted(memory);
  });
  if (lostIds.length === 0) {
    return { verdict: 'intact' };
  }
  const remainingIds = memoryIds.filter((memoryId) => !lostIds.includes(memoryId));
  const citesTraces = cited.length > memoryIds.length;
  if (isPersonEdited(ki)) {
    return {
      verdict: 'needs_review',
      reason: `A person edited it, and ${lostIds.length} of the memories it came from were deleted.`,
    };
  }
  if (citesTraces) {
    return {
      verdict: 'needs_review',
      reason: `${lostIds.length} of the memories it came from were deleted, and it also came from agent conversations, which maintenance cannot read.`,
    };
  }
  if (remainingIds.length > 0) {
    return { verdict: 'rewrite', lostIds, remainingIds };
  }
  if ((ki.references ?? []).length >= MAX_KI_REFERENCES) {
    return {
      verdict: 'needs_review',
      reason:
        'Every memory it still cites was deleted, but it cites as many as it can hold, so older ones may remain.',
    };
  }
  return { verdict: 'tombstone', reason: 'Every memory it came from was deleted.' };
};
