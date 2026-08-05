/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useCallback } from 'react';
import { DEFAULT_AI_INDEX_DATA_STREAM, DEFAULT_AI_INDEX_NAME } from '../../../common/constants';
import type { AiIndexProperties, AiIndexSource } from '../../../common/http_api/ai_indices';
import { putAiIndex } from '../api/ai_indices';
import type { SelectedSource } from '../components/source_picker';
import { getErrorMessage } from '../utils/get_error_message';
import { toAiIndexSources } from '../utils/sources';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

interface CreatedAiIndex {
  id: string;
}

const buildAiIndexProperties = (sources: AiIndexSource[]): { id: string } & AiIndexProperties => ({
  id: DEFAULT_AI_INDEX_NAME,
  name: DEFAULT_AI_INDEX_NAME,
  dest: { type: 'data_stream', value: DEFAULT_AI_INDEX_DATA_STREAM },
  automations: [],
  sources,
});

export const useCreateAiIndex = () => {
  const {
    services: { http, notifications },
  } = useKibana();
  const queryClient = useQueryClient();

  const { mutateAsync, isLoading } = useMutation<CreatedAiIndex, Error, SelectedSource[]>({
    mutationFn: async (selectedSources) => {
      const { id, ...properties } = buildAiIndexProperties(toAiIndexSources(selectedSources));
      await putAiIndex(http, { aiIndexId: id, properties });
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
    async (selectedSources: SelectedSource[]): Promise<CreatedAiIndex | undefined> => {
      try {
        return await mutateAsync(selectedSources);
      } catch {
        // The error toast is surfaced by the mutation's onError handler.
        return undefined;
      }
    },
    [mutateAsync]
  );

  return { createAiIndex, isCreating: isLoading };
};
