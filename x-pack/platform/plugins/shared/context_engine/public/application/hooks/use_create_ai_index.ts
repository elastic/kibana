/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useCallback } from 'react';
import type { AiIndexProperties, AiIndexType } from '../../../common/http_api/ai_indices';
import { createAiIndex as createAiIndexRequest } from '../api/ai_indices';
import { getAiIndexDest } from '../utils/ai_index_dest';
import { getErrorMessage } from '../utils/get_error_message';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

/**
 * Creation asks only for a name and description, so the backing store type is not a choice the
 * user makes. `index` suits the reference and document corpora the Context Engine is used for;
 * time-based sources need a data stream, which has no entry point yet.
 */
export const DEFAULT_AI_INDEX_STORAGE_TYPE: AiIndexType = 'index';

interface CreatedAiIndex {
  id: string;
}

export interface CreateAiIndexArgs {
  id: string;
  description: string;
}

export const useCreateAiIndex = () => {
  const {
    services: { http, notifications },
  } = useKibana();
  const queryClient = useQueryClient();

  const { mutateAsync, isLoading } = useMutation<CreatedAiIndex, Error, CreateAiIndexArgs>({
    mutationFn: async ({ id, description }) => {
      const properties: AiIndexProperties = {
        description: description.trim() || undefined,
        dest: getAiIndexDest(DEFAULT_AI_INDEX_STORAGE_TYPE, id),
        automations: [],
        sources: [],
      };

      await createAiIndexRequest(http, { aiIndexId: id, properties });
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contextEngineQueryKeys.aiIndex.list() });
    },
    onError: (error) => {
      const toastMessage = getErrorMessage(error);
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.contextEngine.createAiIndex.errorTitle', {
          defaultMessage: 'Unable to create AI index',
        }),
        ...(toastMessage ? { toastMessage } : {}),
      });
    },
  });

  const createAiIndex = useCallback(
    async (args: CreateAiIndexArgs): Promise<CreatedAiIndex | undefined> => {
      try {
        return await mutateAsync(args);
      } catch {
        // The error toast is surfaced by the mutation's onError handler.
        return undefined;
      }
    },
    [mutateAsync]
  );

  return { createAiIndex, isCreating: isLoading };
};
