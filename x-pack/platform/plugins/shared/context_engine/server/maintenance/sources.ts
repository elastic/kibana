/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_KI_REFERENCES } from '../../common/step_types/ki';
import { isKiDeleted } from '../ai_indices/ki_revision';
import { isPersonEdited } from '../ai_indices/ki_write';
import { citedMemoryIds, kindOf, type DreamedKi } from '../dreaming/dreamed_ki';
import { isMemoryKiId } from '../dreaming/ids';

/** What maintenance does about the memories an item came from. */
export type SourceVerdict =
  | { verdict: 'intact' }
  | { verdict: 'tombstone'; reason: string }
  | { verdict: 'needs_review'; reason: string }
  | { verdict: 'rewrite'; lostIds: string[]; remainingIds: string[] };

/** The memory KIs an item cites; memories read from outside the AI index are left out. */
export const citedMemoryKiIds = (ki: DreamedKi): string[] =>
  citedMemoryIds(ki).filter(isMemoryKiId);

/**
 * Whether an item lost the memories it came from, and what to do about it. A memory read from outside
 * the AI index, such as a trace round or a session memory, always counts as present. A memory missing from the AI index aged out, and only a deleted one is lost.
 */
export const sourceVerdictOf = (
  ki: DreamedKi,
  memories: ReadonlyMap<string, DreamedKi>
): SourceVerdict => {
  const cited = citedMemoryIds(ki);
  const memoryIds = cited.filter(isMemoryKiId);
  const lostIds = memoryIds.filter((memoryId) => {
    const memory = memories.get(memoryId);
    return memory !== undefined && isKiDeleted(memory);
  });
  if (lostIds.length === 0) {
    return { verdict: 'intact' };
  }
  const remainingIds = memoryIds.filter((memoryId) => !lostIds.includes(memoryId));
  const agedOut = remainingIds.filter((memoryId) => !memories.has(memoryId)).length;
  const citesExternal = cited.length > memoryIds.length;
  if (isPersonEdited(ki)) {
    return {
      verdict: 'needs_review',
      reason: `A person edited it, and ${lostIds.length} of the memories it came from were deleted.`,
    };
  }
  if (agedOut > 0) {
    return {
      verdict: 'needs_review',
      reason: `${lostIds.length} of the memories it came from were deleted, and ${agedOut} more aged out, so a rewrite from those left would drop what the aged-out ones stated.`,
    };
  }
  if (citesExternal && kindOf(ki) !== 'entity') {
    return {
      verdict: 'needs_review',
      reason: `${lostIds.length} of the memories it came from were deleted, and it also came from session memories or agent conversations, which maintenance cannot read.`,
    };
  }
  if ((ki.references ?? []).length >= MAX_KI_REFERENCES) {
    return {
      verdict: 'needs_review',
      reason: `${lostIds.length} of the memories it came from were deleted, but it cites as many as it can hold, so older ones it no longer cites may remain.`,
    };
  }
  if (remainingIds.length > 0 || citesExternal) {
    return { verdict: 'rewrite', lostIds, remainingIds };
  }
  return { verdict: 'tombstone', reason: 'Every memory it came from was deleted.' };
};
