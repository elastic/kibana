/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type { KnowledgeIndicator } from '@kbn/nightshift-ai';
import {
  DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG,
  resolveSignificantEventsTuningConfig,
} from '@kbn/significant-events-schema';
import { OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_TUNING_CONFIG } from '@kbn/management-settings-ids';
import { useCallback, useMemo } from 'react';
import { DISCOVERY_QUERIES_QUERY_KEY } from '../../../hooks/use_fetch_discovery_queries';
import { DISCOVERY_QUERIES_OCCURRENCES_QUERY_KEY } from '../../../hooks/use_fetch_discovery_queries_occurrences';
import { useKibana } from '../../../hooks/use_kibana';
import { useQueriesApi, type PromoteResult } from '../../../hooks/use_queries_api';
import { useStreamFeaturesApi } from '../../../hooks/use_stream_features_api';
import { getFormattedError } from '../../../util/errors';
import { PROMOTE_QUERY_ALREADY_PROMOTED } from '../../../pages/significant_events/components/queries_table/translations';
import { getPromoteSkipReason } from '../../../lib/promote_skip_reason';

export const KI_ROW_ACTION_MUTATION_KEY = ['ki-row-action'];

const DAY_MS = 24 * 60 * 60 * 1000;

const durabilityExpiresAt = (durable: boolean, ttlDays: number): string | undefined =>
  durable ? undefined : new Date(Date.now() + ttlDays * DAY_MS).toISOString();

interface UseKnowledgeIndicatorActionsParams {
  streamName: string;
  onSuccess?: () => void;
}

export function useKnowledgeIndicatorActions({
  streamName,
  onSuccess,
}: UseKnowledgeIndicatorActionsParams) {
  const { core } = useKibana();
  const { toasts } = core.notifications;
  const queryClient = useQueryClient();

  const featureTtlDays = useMemo<number>(() => {
    try {
      const raw = core.settings.globalClient.get<unknown>(
        OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_TUNING_CONFIG,
        DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG
      );
      const stored = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return resolveSignificantEventsTuningConfig(stored).feature_ttl_days;
    } catch {
      return DEFAULT_SIGNIFICANT_EVENTS_TUNING_CONFIG.feature_ttl_days;
    }
  }, [core]);
  const { excludeFeaturesInBulk, restoreFeaturesInBulk, setFeatureDurability } =
    useStreamFeaturesApi(streamName);
  const { promote, setQueryDurability } = useQueriesApi();

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
    mutationFn: async (featureUuid) => {
      await excludeFeaturesInBulk([featureUuid]);
    },
    onSuccess: async () => {
      await invalidateData();
      toasts.addSuccess({ title: EXCLUDE_SUCCESS_TOAST });
      onSuccess?.();
    },
    onError: (error) => {
      toasts.addError(getFormattedError(error), { title: EXCLUDE_ERROR_TOAST });
    },
  });

  const restoreAction = useMutation<void, Error, string>({
    mutationKey: KI_ROW_ACTION_MUTATION_KEY,
    mutationFn: async (featureUuid) => {
      await restoreFeaturesInBulk([featureUuid]);
    },
    onSuccess: async () => {
      await invalidateData();
      toasts.addSuccess({ title: RESTORE_SUCCESS_TOAST });
      onSuccess?.();
    },
    onError: (error) => {
      toasts.addError(getFormattedError(error), { title: RESTORE_ERROR_TOAST });
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
      } else {
        toasts.addInfo({
          title: getPromoteSkipReason(result) ?? PROMOTE_QUERY_ALREADY_PROMOTED,
        });
      }
      onSuccess?.();
    },
    onError: (error) => {
      toasts.addError(getFormattedError(error), { title: PROMOTE_ERROR_TOAST });
    },
  });

  const setDurabilityAction = useMutation<
    void,
    Error,
    { knowledgeIndicator: KnowledgeIndicator; durable: boolean }
  >({
    mutationKey: KI_ROW_ACTION_MUTATION_KEY,
    mutationFn: async ({ knowledgeIndicator, durable }) => {
      const expiresAt = durabilityExpiresAt(durable, featureTtlDays);
      if (knowledgeIndicator.kind === 'feature') {
        await setFeatureDurability(knowledgeIndicator.feature, expiresAt);
      } else {
        await setQueryDurability({
          query: knowledgeIndicator.query,
          streamName: knowledgeIndicator.stream_name,
          expiresAt,
        });
      }
    },
    onSuccess: async (_result, { durable }) => {
      await invalidateData();
      toasts.addSuccess({
        title: durable ? MAKE_DURABLE_SUCCESS_TOAST : MAKE_EXPIRING_SUCCESS_TOAST,
      });
      onSuccess?.();
    },
    onError: (error, { durable }) => {
      toasts.addError(getFormattedError(error), {
        title: durable ? MAKE_DURABLE_ERROR_TOAST : MAKE_EXPIRING_ERROR_TOAST,
      });
    },
  });

  return {
    excludeFeature: excludeAction.mutate,
    restoreFeature: restoreAction.mutate,
    promoteQuery: promoteAction.mutate,
    setDurability: setDurabilityAction.mutate,
    isMutating:
      excludeAction.isLoading ||
      restoreAction.isLoading ||
      promoteAction.isLoading ||
      setDurabilityAction.isLoading,
  };
}

export const EXCLUDE_LABEL = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorActions.excludeLabel',
  { defaultMessage: 'Exclude' }
);

export const RESTORE_LABEL = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorActions.restoreLabel',
  { defaultMessage: 'Restore' }
);

export const PROMOTE_LABEL = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorActions.promoteLabel',
  { defaultMessage: 'Promote' }
);

export const DELETE_LABEL = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorActions.deleteLabel',
  {
    defaultMessage: 'Delete',
  }
);

export const MAKE_DURABLE_LABEL = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorActions.makeDurableLabel',
  { defaultMessage: 'Make durable' }
);

export const MAKE_EXPIRING_LABEL = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorActions.makeExpiringLabel',
  { defaultMessage: 'Make expiring' }
);

const EXCLUDE_SUCCESS_TOAST = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorActions.excludeSuccessToast',
  { defaultMessage: 'Knowledge indicator excluded' }
);

const EXCLUDE_ERROR_TOAST = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorActions.excludeErrorToast',
  { defaultMessage: 'Failed to exclude knowledge indicator' }
);

const RESTORE_SUCCESS_TOAST = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorActions.restoreSuccessToast',
  { defaultMessage: 'Knowledge indicator restored' }
);

const RESTORE_ERROR_TOAST = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorActions.restoreErrorToast',
  { defaultMessage: 'Failed to restore knowledge indicator' }
);

const PROMOTE_SUCCESS_TOAST = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorActions.promoteSuccessToast',
  { defaultMessage: 'Knowledge indicator promoted' }
);

const PROMOTE_ERROR_TOAST = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorActions.promoteErrorToast',
  { defaultMessage: 'Failed to promote knowledge indicator' }
);

const MAKE_DURABLE_SUCCESS_TOAST = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorActions.makeDurableSuccessToast',
  { defaultMessage: 'Knowledge indicator is now durable' }
);

const MAKE_DURABLE_ERROR_TOAST = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorActions.makeDurableErrorToast',
  { defaultMessage: 'Failed to make knowledge indicator durable' }
);

const MAKE_EXPIRING_SUCCESS_TOAST = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorActions.makeExpiringSuccessToast',
  { defaultMessage: 'Knowledge indicator is now expiring' }
);

const MAKE_EXPIRING_ERROR_TOAST = i18n.translate(
  'xpack.significantEventsApp.knowledgeIndicatorActions.makeExpiringErrorToast',
  { defaultMessage: 'Failed to make knowledge indicator expiring' }
);
