/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortController } from '@kbn/react-hooks';
import type { StreamQueryKql, System } from '@kbn/streams-schema';
import { type SignificantEventsGenerateResponse } from '@kbn/streams-schema';
import { useKibana } from './use_kibana';
import { NO_SYSTEM } from '../components/stream_detail_significant_events_view/add_significant_event_flyout/utils/default_query';

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
  generate: (connectorId: string, system?: System) => SignificantEventsGenerateResponse;
  abort: () => void;
}

export function useSignificantEventsApi({
  name,
  start,
  end,
}: {
  name: string;
  start: number;
  end: number;
}): SignificantEventsApi {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { signal, abort, refresh } = useAbortController();

  return {
    upsertQuery: async ({ system, kql, title, id }) => {
      const effectiveSystem = system && system.name === NO_SYSTEM.name ? undefined : system;
      await streamsRepositoryClient.fetch('PUT /api/streams/{name}/queries/{queryId} 2023-10-31', {
        signal,
        params: {
          path: {
            name,
            queryId: id,
          },
          body: {
            kql,
            title,
            system: effectiveSystem,
          },
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
    generate: (connectorId: string, system?: System) => {
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
              from: new Date(start).toString(),
              to: new Date(end).toString(),
            },
            body: {
              system,
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
