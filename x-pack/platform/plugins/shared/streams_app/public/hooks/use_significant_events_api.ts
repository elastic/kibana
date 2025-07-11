/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamQueryKql, type SignificantEventsGenerateResponse } from '@kbn/streams-schema';
import { useMemo } from 'react';
import { useAbortController } from '@kbn/react-hooks';

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
  addQuery: (query: StreamQueryKql) => Promise<void>;
  removeQuery: (id: string) => Promise<void>;
  bulk: (operations: SignificantEventsApiBulkOperation[]) => Promise<void>;
  generate: ({ connectorId }: { connectorId: string }) => SignificantEventsGenerateResponse;
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

  return useMemo(() => {
    return {
      addQuery: async ({ kql, title, id }) => {
        await streamsRepositoryClient.fetch(
          'PUT /api/streams/{name}/queries/{queryId} 2023-10-31',
          {
            signal,
            params: {
              path: {
                name,
                queryId: id,
              },
              body: {
                kql,
                title,
              },
            },
          }
        );
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
      generate: ({ connectorId }: { connectorId: string }) => {
        return streamsRepositoryClient.stream(
          `GET /api/streams/{name}/significant_events/_generate 2023-10-31`,
          {
            signal,
            params: {
              path: {
                name,
              },
              query: {
                connectorId,
              },
            },
          }
        );
      },
    };
  }, [name, signal, streamsRepositoryClient]);
}
