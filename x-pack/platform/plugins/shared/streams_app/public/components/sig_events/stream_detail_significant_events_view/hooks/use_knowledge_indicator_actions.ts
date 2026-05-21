/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { useCallback } from 'react';
import { DISCOVERY_QUERIES_QUERY_KEY } from '../../../../hooks/sig_events/use_fetch_discovery_queries';
import { DISCOVERY_QUERIES_OCCURRENCES_QUERY_KEY } from '../../../../hooks/sig_events/use_fetch_discovery_queries_occurrences';
import { useKibana } from '../../../../hooks/use_kibana';
import { useQueriesApi, type PromoteResult } from '../../../../hooks/sig_events/use_queries_api';
import {
  PROMOTE_QUERY_ALREADY_PROMOTED,
  STATS_PROMOTE_DISABLED_TOOLTIP,
} from '../../significant_events_discovery/components/queries_table/translations';

export const KI_ROW_ACTION_MUTATION_KEY = ['ki-row-action'];

interface UseKnowledgeIndicatorActionsParams {
  streamName: string;
  onSuccess?: () => void;
}

export function useKnowledgeIndicatorActions({
  streamName,
  onSuccess,
}: UseKnowledgeIndicatorActionsParams) {
  const {
    core: {
      notifications: { toasts },
    },
  } = useKibana();
  const queryClient = useQueryClient();
  const { promote } = useQueriesApi();

  const invalidateData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: DISCOVERY_QUERIES_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: DISCOVERY_QUERIES_OCCURRENCES_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: ['features', streamName] }),
      queryClient.invalidateQueries({ queryKey: ['features', 'all'] }),
    ]);
  }, [streamName, queryClient]);

  const promoteAction = useMutation<PromoteResult, Error, string>({
    mutationKey: KI_ROW_ACTION_MUTATION_KEY,
    mutationFn: async (queryId) => {
      return promote({ queryIds: [queryId] });
    },
    onSuccess: async (result) => {
      await invalidateData();
      if (result.promoted > 0) {
        toasts.addSuccess({ title: PROMOTE_SUCCESS_TOAST });
      } else if (result.skipped_stats > 0) {
        toasts.addInfo({ title: STATS_PROMOTE_DISABLED_TOOLTIP });
      } else {
        toasts.addInfo({ title: PROMOTE_QUERY_ALREADY_PROMOTED });
      }
      onSuccess?.();
    },
    onError: (error) => {
      toasts.addError(error, { title: PROMOTE_ERROR_TOAST });
    },
  });

  return {
    promoteQuery: promoteAction.mutate,
    isMutating: promoteAction.isLoading,
  };
}

export const PROMOTE_LABEL = i18n.translate(
  'xpack.streams.knowledgeIndicatorActions.promoteLabel',
  { defaultMessage: 'Promote' }
);

export const DELETE_LABEL = i18n.translate('xpack.streams.knowledgeIndicatorActions.deleteLabel', {
  defaultMessage: 'Delete',
});

const PROMOTE_SUCCESS_TOAST = i18n.translate(
  'xpack.streams.knowledgeIndicatorActions.promoteSuccessToast',
  { defaultMessage: 'Knowledge indicator promoted' }
);

const PROMOTE_ERROR_TOAST = i18n.translate(
  'xpack.streams.knowledgeIndicatorActions.promoteErrorToast',
  { defaultMessage: 'Failed to promote knowledge indicator' }
);
