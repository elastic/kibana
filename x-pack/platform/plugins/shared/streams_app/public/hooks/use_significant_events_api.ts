/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortController } from '@kbn/react-hooks';
import type { StreamQueryKql, Feature } from '@kbn/streams-schema';
import { type SignificantEventsGenerateResponse } from '@kbn/streams-schema';
import { useKibana } from './use_kibana';

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
  generate: (connectorId: string, feature?: Feature) => SignificantEventsGenerateResponse;
  abort: () => void;
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
    generate: (connectorId: string, feature?: Feature) => {
      const now = Date.now();
      return streamsRepositoryClient.stream(
        `POST /api/streams/{name}/significant_events/_generate 2023-10-31`,
        {
          signal,
          params: {
            path: {
              name,
            },
            query: {
              connectorId,
              from: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
              to: new Date(now).toISOString(),
            },
            body: {
              feature,
            },
          },
        }
      );
    },
    abort: () => {
      abort();
      refresh();
    },
  };
}
