/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type {
  DeleteKiResponse,
  RestoreKiResponse,
  UpdateKiResponse,
} from '../../../common/http_api/knowledge_indicators';
import { deleteKi, restoreKi, updateKi } from '../api/knowledge_indicators';
import { useKibana } from './use_kibana';

interface KiMutationScope {
  aiIndexId: string;
  kiId: string;
  index: string;
}

const invalidateKiQueries = (
  queryClient: ReturnType<typeof useQueryClient>,
  { aiIndexId, kiId, index }: KiMutationScope
) => {
  queryClient.invalidateQueries({
    queryKey: ['context_engine', 'ai_index', aiIndexId, 'list_ki'],
  });
  queryClient.invalidateQueries({
    queryKey: ['context_engine', 'ai_index', aiIndexId, 'ki', index, kiId],
  });
};

export const useUpdateKi = ({ aiIndexId, kiId, index }: KiMutationScope) => {
  const {
    services: { http },
  } = useKibana();
  const queryClient = useQueryClient();

  return useMutation<UpdateKiResponse, Error, { content: string }>({
    mutationFn: ({ content }) => updateKi(http, { aiIndexId, kiId, index, content }),
    onSuccess: () => invalidateKiQueries(queryClient, { aiIndexId, kiId, index }),
  });
};

export const useDeleteKi = ({ aiIndexId, kiId, index }: KiMutationScope) => {
  const {
    services: { http },
  } = useKibana();
  const queryClient = useQueryClient();

  return useMutation<DeleteKiResponse, Error, void>({
    mutationFn: () => deleteKi(http, { aiIndexId, kiId, index }),
    onSuccess: () => invalidateKiQueries(queryClient, { aiIndexId, kiId, index }),
  });
};

export const useRestoreKi = ({ aiIndexId, kiId, index }: KiMutationScope) => {
  const {
    services: { http },
  } = useKibana();
  const queryClient = useQueryClient();

  return useMutation<RestoreKiResponse, Error, void>({
    mutationFn: () => restoreKi(http, { aiIndexId, kiId, index }),
    onSuccess: () => invalidateKiQueries(queryClient, { aiIndexId, kiId, index }),
  });
};
