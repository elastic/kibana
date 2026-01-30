/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortController } from '@kbn/react-hooks';
import type {
  StreamQueryKql,
  System,
  SignificantEventsQueriesGenerationTaskResult,
} from '@kbn/streams-schema';
import { useKibana } from './use_kibana';
import { getLast24HoursTimeRange } from '../util/time_range';

interface SignificantEventsApiBulkOperationCreate {
  index: StreamQueryKql;
}
interface SignificantEventsApiBulkOperationDelete {
  delete: { id: string };
}

type SignificantEventsApiBulkOperation =
  | SignificantEventsApiBulkOperationCreate
  | SignificantEventsApiBulkOperationDelete;

interface SignificantEventsApi {
  upsertQuery: (query: StreamQueryKql) => Promise<void>;
  removeQuery: (id: string) => Promise<void>;
  bulk: (operations: SignificantEventsApiBulkOperation[]) => Promise<void>;
  abort: () => void;
  getGenerationTask: () => Promise<SignificantEventsQueriesGenerationTaskResult>;
  scheduleGenerationTask: (
    connectorId: string,
    systems?: System[],
    sampleDocsSize?: number
  ) => Promise<SignificantEventsQueriesGenerationTaskResult>;
  cancelGenerationTask: () => Promise<SignificantEventsQueriesGenerationTaskResult>;
  acknowledgeGenerationTask: () => Promise<SignificantEventsQueriesGenerationTaskResult>;
}

export function useSignificantEventsApi({ name }: { name: string }): SignificantEventsApi {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { signal, abort, refresh } = useAbortController();

  return {
    upsertQuery: async ({ id, ...body }) => {
      await streamsRepositoryClient.fetch('PUT /api/streams/{name}/queries/{queryId} 2023-10-31', {
        signal,
        params: {
          path: {
            name,
            queryId: id,
          },
          body,
        },
      });
    },
    removeQuery: async (id) => {
      await streamsRepositoryClient.fetch(
        'DELETE /api/streams/{name}/queries/{queryId} 2023-10-31',
        {
          signal,
          params: {
            path: {
              name,
              queryId: id,
            },
          },
        }
      );
    },
    bulk: async (operations) => {
      await streamsRepositoryClient.fetch('POST /api/streams/{name}/queries/_bulk 2023-10-31', {
        signal,
        params: {
          path: {
            name,
          },
          body: {
            operations,
          },
        },
      });
    },
    abort: () => {
      abort();
      refresh();
    },
    getGenerationTask: async () => {
      return streamsRepositoryClient.fetch(
        'GET /internal/streams/{name}/significant_events/_status',
        {
          signal,
          params: {
            path: { name },
          },
        }
      );
    },
    scheduleGenerationTask: async (
      connectorId: string,
      systems?: System[],
      sampleDocsSize?: number
    ) => {
      const { from, to } = getLast24HoursTimeRange();
      return streamsRepositoryClient.fetch(
        'POST /internal/streams/{name}/significant_events/_task',
        {
          signal,
          params: {
            path: { name },
            body: {
              action: 'schedule' as const,
              connectorId,
              from,
              to,
              sampleDocsSize,
              systems,
            },
          },
        }
      );
    },
    cancelGenerationTask: async () => {
      return streamsRepositoryClient.fetch(
        'POST /internal/streams/{name}/significant_events/_task',
        {
          signal,
          params: {
            path: { name },
            body: {
              action: 'cancel' as const,
            },
          },
        }
      );
    },
    acknowledgeGenerationTask: async () => {
      return streamsRepositoryClient.fetch(
        'POST /internal/streams/{name}/significant_events/_task',
        {
          signal,
          params: {
            path: { name },
            body: {
              action: 'acknowledge' as const,
            },
          },
        }
      );
    },
  };
}
