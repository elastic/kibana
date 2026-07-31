/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import type { SignificantEventStatus } from '@kbn/significant-events-schema';
import { useKibana } from '../use_kibana';

interface UpdateSignificantEventArgs {
  eventUuid: string;
  status: SignificantEventStatus;
}

interface UpdateSignificantEventResult {
  event_uuid: string;
  updated: number;
  ignored: number;
  status: SignificantEventStatus;
}

const UPDATE_SUCCESS_TOAST_TITLE = i18n.translate(
  'xpack.streams.sigEventsTab.updateEvent.successToastTitle',
  {
    defaultMessage: 'Significant event updated',
  }
);

const UPDATE_ERROR_TOAST_TITLE = i18n.translate(
  'xpack.streams.sigEventsTab.updateEvent.errorToastTitle',
  {
    defaultMessage: 'Failed to update significant event',
  }
);

export const useUpdateSignificantEvent = ({
  onUpdateSuccess,
}: { onUpdateSuccess?: () => void } = {}) => {
  const {
    core: {
      notifications: { toasts },
    },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const queryClient = useQueryClient();

  const mutation = useMutation<UpdateSignificantEventResult, Error, UpdateSignificantEventArgs>({
    mutationFn: ({ eventUuid, status }: UpdateSignificantEventArgs) =>
      streamsRepositoryClient.fetch('POST /internal/significant_events/events/{id}/update', {
        params: { path: { id: eventUuid }, body: { status } },
        signal: null,
      }),
    onSuccess: () => {
      toasts.addSuccess({ title: UPDATE_SUCCESS_TOAST_TITLE });
      onUpdateSuccess?.();
    },
    onError: (error) => {
      toasts.addError(error, { title: UPDATE_ERROR_TOAST_TITLE });
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['significantEvents'], exact: false }),
        queryClient.invalidateQueries({ queryKey: ['significantEventLifecycle'], exact: false }),
      ]);
    },
  });

  return {
    updateEventStatus: (args: UpdateSignificantEventArgs) => mutation.mutate(args),
    isUpdating: mutation.isLoading,
  };
};
