/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import { useCallback } from 'react';
import type { DeleteAiIndexResponse } from '../../../common/http_api/ai_indices';
import { deleteAiIndex as deleteAiIndexRequest } from '../api/ai_indices';
import { useKibana } from './use_kibana';

interface DeleteAiIndexArgs {
  aiIndexId: string;
  deleteKnowledgeIndicators: boolean;
  deleteAutomations: boolean;
}

export const useDeleteAiIndex = () => {
  const {
    services: { http },
  } = useKibana();

  const { mutateAsync, isLoading } = useMutation<DeleteAiIndexResponse, Error, DeleteAiIndexArgs>({
    mutationFn: ({ aiIndexId, deleteKnowledgeIndicators, deleteAutomations }) =>
      deleteAiIndexRequest(http, { aiIndexId, deleteKnowledgeIndicators, deleteAutomations }),
  });

  const deleteAiIndex = useCallback(
    (args: DeleteAiIndexArgs): Promise<DeleteAiIndexResponse> => mutateAsync(args),
    [mutateAsync]
  );

  return { deleteAiIndex, isDeleting: isLoading };
};
