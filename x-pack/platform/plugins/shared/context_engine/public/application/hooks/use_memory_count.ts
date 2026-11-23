/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KI_NOT_DELETED_STATUSES } from '../../../common/ki_lifecycle_status';
import { MEMORY_KI_TYPES } from '../../../common/memory';
import { useListKi } from './use_list_ki';

const [SESSION_MEMORY_TYPE, SESSION_FACT_MEMORY_TYPE] = MEMORY_KI_TYPES;

interface UseMemoryCountResult {
  memoryCount: number;
  /** True until both counts belong to this AI index. */
  isLoading: boolean;
}

/**
 * How many memories an AI index has. Counted per memory type, because the KI list summary keeps
 * only the biggest few types and can leave the memories out.
 */
export const useMemoryCount = (
  aiIndexId: string | undefined,
  { enabled }: { enabled: boolean }
): UseMemoryCountResult => {
  const sessions = useListKi({
    aiIndexId,
    size: 0,
    type: SESSION_MEMORY_TYPE,
    status: KI_NOT_DELETED_STATUSES,
    enabled,
  });
  const sessionFacts = useListKi({
    aiIndexId,
    size: 0,
    type: SESSION_FACT_MEMORY_TYPE,
    status: KI_NOT_DELETED_STATUSES,
    enabled,
  });

  if (!enabled) {
    return { memoryCount: 0, isLoading: false };
  }

  return {
    memoryCount: sessions.total + sessionFacts.total,
    isLoading:
      sessions.isLoading ||
      sessionFacts.isLoading ||
      sessions.isPreviousData ||
      sessionFacts.isPreviousData,
  };
};
