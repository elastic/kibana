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
import { useStreamFeaturesApi } from '../../../../hooks/sig_events/use_stream_features_api';
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
  const { excludeFeaturesInBulk, restoreFeaturesInBulk } = useStreamFeaturesApi(streamName);
  const { promote } = useQueriesApi();

  const invalidateData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: DISCOVERY_QUERIES_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: DISCOVERY_QUERIES_OCCURRENCES_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: ['features', streamName] }),
      queryClient.invalidateQueries({ queryKey: ['features', 'all'] }),
    ]);
  }, [streamName, queryClient]);

  const excludeAction = useMutation<void, Error, string>({
    mutationKey: KI_ROW_ACTION_MUTATION_KEY,
    mutationFn: async (featureId) => {
      await excludeFeaturesInBulk([featureId]);
    },
    onSuccess: async () => {
      await invalidateData();
      toasts.addSuccess({ title: EXCLUDE_SUCCESS_TOAST });
      onSuccess?.();
    },
    onError: (error) => {
      toasts.addError(error, { title: EXCLUDE_ERROR_TOAST });
    },
  });

  const restoreAction = useMutation<void, Error, string>({
    mutationKey: KI_ROW_ACTION_MUTATION_KEY,
    mutationFn: async (featureId) => {
      await restoreFeaturesInBulk([featureId]);
    },
    onSuccess: async () => {
      await invalidateData();
      // Deliberate divergence from main: restore is a tombstone on this
      // branch, so the feature disappears from both Active and Excluded
      // until the next extraction redrives it.
      toasts.addSuccess({
        title: RESTORE_SUCCESS_TOAST_TITLE,
        text: RESTORE_SUCCESS_TOAST_BODY,
      });
      onSuccess?.();
    },
    onError: (error) => {
      toasts.addError(error, { title: RESTORE_ERROR_TOAST });
    },
  });

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
    excludeFeature: excludeAction.mutate,
    restoreFeature: restoreAction.mutate,
    promoteQuery: promoteAction.mutate,
    isMutating: excludeAction.isLoading || restoreAction.isLoading || promoteAction.isLoading,
  };
}

export const EXCLUDE_LABEL = i18n.translate(
  'xpack.streams.knowledgeIndicatorActions.excludeLabel',
  { defaultMessage: 'Exclude' }
);

export const RESTORE_LABEL = i18n.translate(
  'xpack.streams.knowledgeIndicatorActions.restoreLabel',
  { defaultMessage: 'Restore' }
);

export const PROMOTE_LABEL = i18n.translate(
  'xpack.streams.knowledgeIndicatorActions.promoteLabel',
  { defaultMessage: 'Promote' }
);

export const DELETE_LABEL = i18n.translate('xpack.streams.knowledgeIndicatorActions.deleteLabel', {
  defaultMessage: 'Delete',
});

const EXCLUDE_SUCCESS_TOAST = i18n.translate(
  'xpack.streams.knowledgeIndicatorActions.excludeSuccessToast',
  { defaultMessage: 'Knowledge indicator excluded' }
);

const EXCLUDE_ERROR_TOAST = i18n.translate(
  'xpack.streams.knowledgeIndicatorActions.excludeErrorToast',
  { defaultMessage: 'Failed to exclude knowledge indicator' }
);

const RESTORE_SUCCESS_TOAST_TITLE = i18n.translate(
  'xpack.streams.knowledgeIndicatorActions.restoreSuccessToastTitle',
  { defaultMessage: 'Restored' }
);

const RESTORE_SUCCESS_TOAST_BODY = i18n.translate(
  'xpack.streams.knowledgeIndicatorActions.restoreSuccessToastBody',
  {
    defaultMessage: 'The feature will be re-evaluated on the next extraction.',
  }
);

const RESTORE_ERROR_TOAST = i18n.translate(
  'xpack.streams.knowledgeIndicatorActions.restoreErrorToast',
  { defaultMessage: 'Failed to restore knowledge indicator' }
);

const PROMOTE_SUCCESS_TOAST = i18n.translate(
  'xpack.streams.knowledgeIndicatorActions.promoteSuccessToast',
  { defaultMessage: 'Knowledge indicator promoted' }
);

const PROMOTE_ERROR_TOAST = i18n.translate(
  'xpack.streams.knowledgeIndicatorActions.promoteErrorToast',
  { defaultMessage: 'Failed to promote knowledge indicator' }
);
