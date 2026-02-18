/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useAbortController } from '@kbn/react-hooks';
import type { PartitionSuggestionTaskResult } from '@kbn/streams-plugin/server/routes/internal/streams/management/partition_suggestion_task_route';
import { useKibana } from './use_kibana';

interface PartitionSuggestionApi {
  getPartitionSuggestionStatus: () => Promise<PartitionSuggestionTaskResult>;
  schedulePartitionSuggestionTask: (params: {
    connectorId?: string;
    start: number;
    end: number;
  }) => Promise<void>;
  cancelPartitionSuggestionTask: () => Promise<void>;
  acknowledgePartitionSuggestionTask: () => Promise<PartitionSuggestionTaskResult>;
}

export function usePartitionSuggestionApi(streamName: string): PartitionSuggestionApi {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { signal } = useAbortController();

  return useMemo(
    () => ({
      getPartitionSuggestionStatus: async () => {
        return streamsRepositoryClient.fetch(
          'POST /internal/streams/{name}/_partition_suggestion/_status',
          {
            signal,
            params: {
              path: { name: streamName },
            },
          }
        );
      },
      schedulePartitionSuggestionTask: async (params: {
        connectorId?: string;
        start: number;
        end: number;
      }) => {
        await streamsRepositoryClient.fetch(
          'POST /internal/streams/{name}/_partition_suggestion/_task',
          {
            signal,
            params: {
              path: { name: streamName },
              body: {
                action: 'schedule',
                connectorId: params.connectorId,
                start: params.start,
                end: params.end,
              },
            },
          }
        );
      },
      cancelPartitionSuggestionTask: async () => {
        await streamsRepositoryClient.fetch(
          'POST /internal/streams/{name}/_partition_suggestion/_task',
          {
            signal,
            params: {
              path: { name: streamName },
              body: {
                action: 'cancel',
              },
            },
          }
        );
      },
      acknowledgePartitionSuggestionTask: async () => {
        return streamsRepositoryClient.fetch(
          'POST /internal/streams/{name}/_partition_suggestion/_task',
          {
            signal,
            params: {
              path: { name: streamName },
              body: {
                action: 'acknowledge',
              },
            },
          }
        );
      },
    }),
    [streamsRepositoryClient, signal, streamName]
  );
}
