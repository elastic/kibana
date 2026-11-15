/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { AiIndexDreamingConfig } from '../../../common/dreaming';
import { getAiIndexDreaming } from '../api/ai_indices';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

interface UseAiIndexDreamingResult {
  dreaming: AiIndexDreamingConfig | undefined;
  isLoading: boolean;
}

/** Fetches an AI index's dreaming config, when `enabled`. */
export const useAiIndexDreaming = (
  aiIndexId: string,
  { enabled }: { enabled: boolean }
): UseAiIndexDreamingResult => {
  const {
    services: { http },
  } = useKibana();

  const { data, isInitialLoading } = useQuery({
    queryKey: contextEngineQueryKeys.aiIndex.dreaming(aiIndexId),
    queryFn: ({ signal }) => getAiIndexDreaming(http, { aiIndexId, signal }),
    enabled,
  });

  return { dreaming: data?.dreaming, isLoading: isInitialLoading };
};
