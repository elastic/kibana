/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortController } from '@kbn/react-hooks';
import type { StreamQuery } from '@kbn/streams-schema';
import { useKibana } from './use_kibana';

interface SignificantEventsApiBulkOperationCreate {
  index: StreamQuery;
}
interface SignificantEventsApiBulkOperationDelete {
  delete: { id: string };
}

type SignificantEventsApiBulkOperation =
  | SignificantEventsApiBulkOperationCreate
  | SignificantEventsApiBulkOperationDelete;

interface SignificantEventsApi {
  upsertQuery: (query: StreamQuery) => Promise<void>;
  removeQuery: (id: string) => Promise<void>;
  bulk: (operations: SignificantEventsApiBulkOperation[]) => Promise<void>;
}

export function useSignificantEventsApi({ name }: { name: string }): SignificantEventsApi {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { signal } = useAbortController();

  return {
    upsertQuery: async ({ id, esql, ...body }) => {
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
            operations: operations.map((op) => {
              if ('index' in op) {
                const { esql: _esql, ...index } = op.index;
                return { index };
              }
              return op;
            }),
          },
        },
      });
    },
  };
}
