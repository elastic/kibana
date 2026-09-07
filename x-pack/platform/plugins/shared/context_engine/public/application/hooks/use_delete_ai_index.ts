/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { useCallback } from 'react';
import { deleteAiIndex as deleteAiIndexRequest } from '../api/ai_indices';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

/** Deletes an AI index and invalidates the cached list so the grid refreshes. */
export const useDeleteAiIndex = () => {
  const {
    services: { http },
  } = useKibana();
  const queryClient = useQueryClient();

  const { mutateAsync, isLoading } = useMutation<void, Error, string>({
    mutationFn: async (aiIndexId) => {
      await deleteAiIndexRequest(http, { aiIndexId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contextEngineQueryKeys.aiIndex.list() });
    },
  });

  const deleteAiIndex = useCallback(
    async (aiIndexId: string): Promise<void> => {
      await mutateAsync(aiIndexId);
    },
    [mutateAsync]
  );

  return { deleteAiIndex, isDeleting: isLoading };
};
