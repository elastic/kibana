/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedRecallInclude } from './include';

const RECALL_CANDIDATE_POOL_SIZE = 100;

export interface CandidatePoolAllocation {
  readonly sessionEvents: number;
  readonly sessionMemory: number;
  readonly aiIndices: number;
}

const STORE_WEIGHTS = {
  sessionEvents: 1,
  sessionMemory: 1,
  aiIndices: 2,
} as const;

export const allocateCandidatePool = ({
  sessionEvents,
  sessionMemory,
  aiIndices,
}: ParsedRecallInclude): CandidatePoolAllocation => {
  const eventsWeight = sessionEvents ? STORE_WEIGHTS.sessionEvents : 0;
  const memoryWeight = sessionMemory ? STORE_WEIGHTS.sessionMemory : 0;
  const aiWeight = aiIndices.kind !== 'none' ? STORE_WEIGHTS.aiIndices : 0;
  const totalWeight = eventsWeight + memoryWeight + aiWeight;
  if (totalWeight === 0) {
    return { sessionEvents: 0, sessionMemory: 0, aiIndices: 0 };
  }
  const eventsCount = Math.floor((RECALL_CANDIDATE_POOL_SIZE * eventsWeight) / totalWeight);
  const memoryCount = Math.floor((RECALL_CANDIDATE_POOL_SIZE * memoryWeight) / totalWeight);
  const aiCount = aiWeight > 0 ? RECALL_CANDIDATE_POOL_SIZE - eventsCount - memoryCount : 0;
  return { sessionEvents: eventsCount, sessionMemory: memoryCount, aiIndices: aiCount };
};
