/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { useCallback } from 'react';
import type { DeleteAiIndexResponse } from '../../../common/http_api/ai_indices';
import { deleteAiIndex as deleteAiIndexRequest } from '../api/ai_indices';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

interface DeleteAiIndexArgs {
  aiIndexId: string;
  deleteKnowledgeIndicators: boolean;
  deleteAutomations: boolean;
}

/** Deletes an AI index and invalidates the cached list so the grid refreshes. */
export const useDeleteAiIndex = () => {
  const {
    services: { http },
  } = useKibana();
  const queryClient = useQueryClient();

  const { mutateAsync, isLoading } = useMutation<
    DeleteAiIndexResponse,
    Error,
    DeleteAiIndexArgs
  >({
    mutationFn: ({ aiIndexId, deleteKnowledgeIndicators, deleteAutomations }) =>
      deleteAiIndexRequest(http, { aiIndexId, deleteKnowledgeIndicators, deleteAutomations }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contextEngineQueryKeys.aiIndex.list() });
    },
  });

  const deleteAiIndex = useCallback(
    (args: DeleteAiIndexArgs): Promise<DeleteAiIndexResponse> => mutateAsync(args),
    [mutateAsync]
  );

  return { deleteAiIndex, isDeleting: isLoading };
};
