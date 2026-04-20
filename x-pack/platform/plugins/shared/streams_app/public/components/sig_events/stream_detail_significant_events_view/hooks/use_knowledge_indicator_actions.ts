/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type { Streams } from '@kbn/streams-schema';
import { useCallback } from 'react';
import { DISCOVERY_QUERIES_QUERY_KEY } from '../../../../hooks/sig_events/use_fetch_discovery_queries';
import { useKibana } from '../../../../hooks/use_kibana';
import { useQueriesApi } from '../../../../hooks/sig_events/use_queries_api';
import { useStreamFeaturesApi } from '../../../../hooks/sig_events/use_stream_features_api';

interface UseKnowledgeIndicatorActionsParams {
  definition: Streams.all.Definition;
  onSuccess?: () => void;
}

export function useKnowledgeIndicatorActions({
  definition,
  onSuccess,
}: UseKnowledgeIndicatorActionsParams) {
  const {
    core: {
      notifications: { toasts },
    },
  } = useKibana();
  const queryClient = useQueryClient();
  const { excludeFeaturesInBulk, restoreFeaturesInBulk } = useStreamFeaturesApi(definition);
  const { promote } = useQueriesApi();

  const invalidateData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: DISCOVERY_QUERIES_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: ['features', definition.name] }),
    ]);
  }, [definition.name, queryClient]);

  const excludeAction = useMutation<void, Error, string>({
    mutationFn: async (featureUuid) => {
      await excludeFeaturesInBulk([featureUuid]);
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
    mutationFn: async (featureUuid) => {
      await restoreFeaturesInBulk([featureUuid]);
    },
    onSuccess: async () => {
      await invalidateData();
      toasts.addSuccess({ title: RESTORE_SUCCESS_TOAST });
      onSuccess?.();
    },
    onError: (error) => {
      toasts.addError(error, { title: RESTORE_ERROR_TOAST });
    },
  });

  const promoteAction = useMutation<void, Error, string>({
    mutationFn: async (queryId) => {
      await promote({ queryIds: [queryId] });
    },
    onSuccess: async () => {
      await invalidateData();
      toasts.addSuccess({ title: PROMOTE_SUCCESS_TOAST });
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

const RESTORE_SUCCESS_TOAST = i18n.translate(
  'xpack.streams.knowledgeIndicatorActions.restoreSuccessToast',
  { defaultMessage: 'Knowledge indicator restored' }
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
