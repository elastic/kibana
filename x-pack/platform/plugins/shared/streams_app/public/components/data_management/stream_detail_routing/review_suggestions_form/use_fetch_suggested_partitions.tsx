/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortController } from '@kbn/react-hooks';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { lastValueFrom } from 'rxjs';
import { useKibana } from '../../../../hooks/use_kibana';
import { showErrorToast } from '../../../../hooks/use_streams_app_fetch';

export interface FetchSuggestedPartitionsParams {
  streamName: string;
  connectorId: string;
  start: number;
  end: number;
}

export function useFetchSuggestedPartitions() {
  const {
    core: { notifications },
    services: { telemetryClient },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const abortController = useAbortController();

  return useAsyncFn(
    async (params: FetchSuggestedPartitionsParams | null) => {
      if (params === null) {
        return Promise.resolve(undefined); // Reset to initial value
      }

      // The only reason we're streaming the response here is to avoid timeout issues prevalent with long-running requests to LLMs.
      // There is only ever going to be a single event emitted so we can safely use `lastValueFrom`.
      return lastValueFrom(
        streamsRepositoryClient.stream('POST /internal/streams/{name}/_suggest_partitions', {
          signal: abortController.signal,
          params: {
            path: { name: params.streamName },
            body: {
              connector_id: params.connectorId,
              start: params.start,
              end: params.end,
            },
          },
        })
      ).catch((error) => {
        showErrorToast(notifications, error);
        throw error;
      });
    },
    [abortController, notifications, streamsRepositoryClient, telemetryClient]
  );
}
