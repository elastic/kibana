/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { EuiFlexGroup, EuiLoadingSpinner } from '@elastic/eui';
import { Streams } from '@kbn/streams-schema';
import { STREAMS_UI_PRIVILEGES } from '@kbn/streams-plugin/public';
import { useStreamsAppFetch } from './use_streams_app_fetch';
import { useKibana } from './use_kibana';

export interface StreamDetailContextProviderProps {
  name: string;
  streamsRepositoryClient: StreamsRepositoryClient;
}

export interface StreamDetailContextValue {
  definition: Streams.ingest.all.GetResponse;
  loading: boolean;
  refresh: () => void;
}

const StreamDetailContext = React.createContext<StreamDetailContextValue | undefined>(undefined);

export function StreamDetailContextProvider({
  name,
  streamsRepositoryClient,
  children,
}: React.PropsWithChildren<StreamDetailContextProviderProps>) {
  const {
    core: {
      application: {
        capabilities: {
          streams: { [STREAMS_UI_PRIVILEGES.manage]: canManage },
        },
      },
    },
  } = useKibana();
  const {
    value: definition,
    loading,
    refresh,
  } = useStreamsAppFetch(
    async ({ signal }) => {
      return streamsRepositoryClient
        .fetch('GET /api/streams/{name} 2023-10-31', {
          signal,
          params: {
            path: {
              name,
            },
          },
        })
        .then((response) => {
          if (Streams.ingest.all.GetResponse.is(response)) {
            return {
              ...response,
              privileges: {
                ...response.privileges,
                // restrict the manage privilege by the Elasticsearch-level data-stream specific privilege and the Kibana-level UI privilege
                // the UI should only enable manage features if the user has privileges on both levels for the current stream
                manage: response.privileges.manage && canManage,
              },
            };
          }

          throw new Error('Stream detail only supports IngestStreams.');
        });
    },
    [streamsRepositoryClient, name, canManage]
  );

  const context = React.useMemo(
    // useMemo cannot be used conditionally after the definition narrowing, the assertion is to narrow correctly the context value
    () => ({ definition, loading, refresh } as StreamDetailContextValue),
    [definition, loading, refresh]
  );

  // Display loading spinner for first data-fetching only to have SWR-like behaviour
  if (!definition && loading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center">
        <EuiLoadingSpinner size="xxl" />
      </EuiFlexGroup>
    );
  }

  if (!definition) {
    return null;
  }

  return <StreamDetailContext.Provider value={context}>{children}</StreamDetailContext.Provider>;
}

export function useStreamDetail() {
  const ctx = React.useContext(StreamDetailContext);
  if (!ctx) {
    throw new Error('useStreamDetail must be used within a StreamDetailContextProvider');
  }
  return ctx;
}
