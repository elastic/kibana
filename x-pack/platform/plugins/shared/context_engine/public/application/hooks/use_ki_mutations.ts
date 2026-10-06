/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { KiPartialFields } from '../../../common/step_types/ki';
import type {
  DeleteKiResponse,
  RestoreKiResponse,
  UpdateKiResponse,
} from '../../../common/http_api/knowledge_indicators';
import { deleteKi, restoreKi, updateKi } from '../api/knowledge_indicators';
import { useKibana } from './use_kibana';

interface KiMutationArgs {
  aiIndexId: string;
  kiId: string;
  index: string;
}

export const useUpdateKi = ({ aiIndexId, kiId, index }: KiMutationArgs) => {
  const {
    services: { http },
  } = useKibana();
  const queryClient = useQueryClient();

  return useMutation<UpdateKiResponse, Error, KiPartialFields>({
    mutationFn: (ki) => updateKi(http, { aiIndexId, kiId, index, ki }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'context_engine' &&
          query.queryKey[1] === 'ai_index' &&
          query.queryKey[2] === aiIndexId &&
          (query.queryKey[3] === 'ki_list' ||
            (query.queryKey[3] === 'ki' &&
              query.queryKey[4] === index &&
              query.queryKey[5] === kiId)),
      });
    },
  });
};

const invalidateKiQueries =
  (aiIndexId: string, index: string, kiId: string) =>
  async (queryClient: ReturnType<typeof useQueryClient>) => {
    await queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] === 'context_engine' &&
        query.queryKey[1] === 'ai_index' &&
        query.queryKey[2] === aiIndexId &&
        (query.queryKey[3] === 'ki_list' ||
          (query.queryKey[3] === 'ki' &&
            query.queryKey[4] === index &&
            query.queryKey[5] === kiId)),
    });
  };

export const useDeleteKi = ({ aiIndexId, kiId, index }: KiMutationArgs) => {
  const {
    services: { http },
  } = useKibana();
  const queryClient = useQueryClient();

  return useMutation<DeleteKiResponse, Error, void>({
    mutationFn: () => deleteKi(http, { aiIndexId, kiId, index }),
    onSuccess: async () => {
      await invalidateKiQueries(aiIndexId, index, kiId)(queryClient);
    },
  });
};

export const useRestoreKi = ({ aiIndexId, kiId, index }: KiMutationArgs) => {
  const {
    services: { http },
  } = useKibana();
  const queryClient = useQueryClient();

  return useMutation<RestoreKiResponse, Error, void>({
    mutationFn: () => restoreKi(http, { aiIndexId, kiId, index }),
    onSuccess: async () => {
      await invalidateKiQueries(aiIndexId, index, kiId)(queryClient);
    },
  });
};
