/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { StreamUpsertRequest } from '@kbn/streams-schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { streamsKeys } from './query_key_factory';
import { useKibana } from './use_kibana';

type ServerError = IHttpFetchError<ResponseErrorBody>;

export function useUpdateStream() {
  const queryClient = useQueryClient();

  const {
    core: { notifications },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const controller = new AbortController();

  return useMutation<
    { acknowledged: true; result: 'updated' | 'created' },
    ServerError,
    { name: string; request: StreamUpsertRequest }
  >(
    ['updateStreams'],
    ({ name, request }) => {
      return streamsRepositoryClient.fetch('PUT /api/streams/{name} 2023-10-31', {
        params: { path: { name }, body: request },
        signal: controller.signal,
      });
    },
    {
      onSuccess: (data, { name }) => {
        queryClient.invalidateQueries({ queryKey: streamsKeys.streams(name), exact: false });

        notifications.toasts.addSuccess(
          i18n.translate('xpack.streams.useUpdateStreams.success', {
            defaultMessage: '{name} stream updated successfully',
            values: {
              name,
            },
          })
        );
      },
      onError: (error, { name }) => {
        notifications.toasts.addError(error, {
          title: i18n.translate('xpack.streams.useUpdateStreams.error', {
            defaultMessage: 'Failed to update {name} stream',
            values: {
              name,
            },
          }),
        });
      },
    }
  );
}
