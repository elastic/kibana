/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useCallback } from 'react';
import type {
  AiIndexProperties,
  GetAiIndexResponse,
  PutAiIndexResponse,
} from '../../../common/http_api/ai_indices';
import { putAiIndex } from '../api/ai_indices';
import type { SelectedSource } from '../components/source_picker';
import { getErrorMessage } from '../utils/get_error_message';
import { toAiIndexSources } from '../utils/sources';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

interface SaveSourcesVariables {
  aiIndex: GetAiIndexResponse;
  selectedSources: SelectedSource[];
}

/**
 * Persists a new set of sources on an existing AI index. The PUT endpoint is an
 * upsert of the full record, so the current name, description, dest and
 * automations are carried over unchanged and only the sources are replaced.
 */
export const useSaveAiIndexSources = () => {
  const {
    services: { http, notifications },
  } = useKibana();
  const queryClient = useQueryClient();

  const { mutateAsync, isLoading } = useMutation<PutAiIndexResponse, Error, SaveSourcesVariables>({
    mutationFn: ({ aiIndex, selectedSources }) => {
      const properties: AiIndexProperties = {
        name: aiIndex.name,
        ...(aiIndex.description !== undefined ? { description: aiIndex.description } : {}),
        dest: aiIndex.dest,
        automations: aiIndex.automations,
        sources: toAiIndexSources(selectedSources),
      };
      return putAiIndex(http, { aiIndexId: aiIndex.id, properties });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contextEngineQueryKeys.aiIndex.list() });
    },
    onError: (error) => {
      const toastMessage = getErrorMessage(error);
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.contextEngine.saveAiIndexSources.errorTitle', {
          defaultMessage: 'Unable to update sources',
        }),
        ...(toastMessage ? { toastMessage } : {}),
      });
    },
  });

  const saveSources = useCallback(
    async (aiIndex: GetAiIndexResponse, selectedSources: SelectedSource[]): Promise<boolean> => {
      try {
        await mutateAsync({ aiIndex, selectedSources });
        return true;
      } catch {
        // The error toast is surfaced by the mutation's onError handler.
        return false;
      }
    },
    [mutateAsync]
  );

  return { saveSources, isSaving: isLoading };
};
