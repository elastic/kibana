/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type { MemoryDreamingStatusResponse } from '../../../common/http_api/memory';
import {
  disableMemoryDreaming,
  enableMemoryDreaming,
  getMemoryDreamingStatus,
  runMemoryDreaming,
} from '../api/memory';
import { getErrorMessage } from '../utils/get_error_message';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

const RUNNING_REFETCH_INTERVAL_MS = 5000;
const CATCHING_UP_REFETCH_INTERVAL_MS = 30000;

/** Dreaming status for the current space; refetched while a dream runs or catches up. */
export const useMemoryDreamingStatus = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const {
    services: { http },
  } = useKibana();

  const { data, isLoading, error } = useQuery<MemoryDreamingStatusResponse, Error>({
    queryKey: contextEngineQueryKeys.memory.dreaming(),
    queryFn: ({ signal }) => getMemoryDreamingStatus(http, { signal }),
    refetchInterval: (status) =>
      status?.running
        ? RUNNING_REFETCH_INTERVAL_MS
        : status?.catching_up
        ? CATCHING_UP_REFETCH_INTERVAL_MS
        : false,
    enabled,
  });

  return { status: data, isLoading, error: error ?? undefined };
};

const useDreamingMutation = <TVariables>({
  mutationFn,
  errorTitle,
}: {
  mutationFn: (variables: TVariables) => Promise<MemoryDreamingStatusResponse>;
  errorTitle: string;
}) => {
  const {
    services: { notifications },
  } = useKibana();
  const queryClient = useQueryClient();

  return useMutation<MemoryDreamingStatusResponse, Error, TVariables>({
    mutationFn,
    onSuccess: (status) => {
      queryClient.setQueryData(contextEngineQueryKeys.memory.dreaming(), status);
    },
    onError: (error) => {
      const toastMessage = getErrorMessage(error);
      notifications.toasts.addError(error, {
        title: errorTitle,
        ...(toastMessage ? { toastMessage } : {}),
      });
    },
  });
};

/** Turns dreaming on, on a schedule or manual only, or off for the current space. */
export const useSetMemoryDreaming = () => {
  const {
    services: { http },
  } = useKibana();

  const { mutate, isLoading } = useDreamingMutation<{
    enabled: boolean;
    scheduled: boolean;
    rebuild?: boolean;
  }>({
    mutationFn: ({ enabled, scheduled, rebuild = false }) =>
      enabled ? enableMemoryDreaming(http, { scheduled, rebuild }) : disableMemoryDreaming(http),
    errorTitle: i18n.translate('xpack.contextEngine.memory.dreaming.saveError', {
      defaultMessage: 'Unable to update dreaming',
    }),
  });

  return { setDreaming: mutate, isSaving: isLoading };
};

/** Starts a dream now in the current space. */
export const useRunMemoryDreaming = () => {
  const {
    services: { http },
  } = useKibana();

  const { mutate, isLoading } = useDreamingMutation<void>({
    mutationFn: () => runMemoryDreaming(http),
    errorTitle: i18n.translate('xpack.contextEngine.memory.dreaming.runError', {
      defaultMessage: 'Unable to start a dream',
    }),
  });

  return { runDream: () => mutate(), isStarting: isLoading };
};
