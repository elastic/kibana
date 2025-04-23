/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import {
  IngestStreamGetResponse,
  isWiredStreamGetResponse,
  isUnwiredStreamGetResponse,
} from '@kbn/streams-schema';
import { EuiFlexGroup, EuiLoadingSpinner, EuiTab, EuiTabs } from '@elastic/eui';
import { useStreamsAppFetch } from './use_streams_app_fetch';

export interface StreamDetailContextProviderProps {
  name: string;
  streamsRepositoryClient: StreamsRepositoryClient;
}

export interface StreamDetailContextValue {
  definition: IngestStreamGetResponse;
  loading: boolean;
  server: string;
  refresh: () => void;
}

const StreamDetailContext = React.createContext<StreamDetailContextValue | undefined>(undefined);

export function StreamDetailContextProvider({
  name,
  streamsRepositoryClient,
  children,
}: React.PropsWithChildren<StreamDetailContextProviderProps>) {
  const {
    value: definition,
    loading,
    refresh,
  } = useStreamsAppFetch(
    async ({ signal }) => {
      const remoteStreams = await streamsRepositoryClient.fetch(
        'GET /api/streams/{name}/_remote 2023-10-31',
        {
          signal,
          params: {
            path: {
              name,
            },
          },
        }
      );
      try {
        const response = await streamsRepositoryClient.fetch('GET /api/streams/{name} 2023-10-31', {
          signal,
          params: {
            path: {
              name,
            },
          },
        });
        if (isWiredStreamGetResponse(response) || isUnwiredStreamGetResponse(response)) {
          return { ...response, remoteStreams: { ...remoteStreams, _local: response } };
        }

        throw new Error('Stream detail only supports IngestStreams.');
      } catch (error) {
        const hasRemoteStreams = Object.entries(remoteStreams).some(
          (stream) => !('error' in stream)
        );
        if (!hasRemoteStreams) {
          throw error;
        }

        const firstRemoteStreamResponse = Object.values(remoteStreams).find(
          (stream) =>
            !('error' in stream) &&
            (isWiredStreamGetResponse(stream) || isUnwiredStreamGetResponse(stream))
        );
        if (firstRemoteStreamResponse) {
          return { ...firstRemoteStreamResponse, remoteStreams };
        }
        throw error;
      }
    },
    [streamsRepositoryClient, name]
  );

  const [selectedServer, setSelectedServer] = useState<string | undefined>();
  const hasRemoteStreams = Object.entries(definition?.remoteStreams || {}).some(
    (stream) => !('error' in stream)
  );

  useEffect(() => {
    if (definition?.remoteStreams) {
      const hasToUpdate = !selectedServer || !definition.remoteStreams[selectedServer];
      if (hasToUpdate) {
        const firstRemoteStream = Object.entries(definition.remoteStreams).find(
          (stream) => !('error' in stream[1])
        );
        if (firstRemoteStream) {
          setSelectedServer(firstRemoteStream[0]);
        }
      }
    }
  }, [definition?.remoteStreams, selectedServer]);

  const currentDefinition =
    selectedServer && hasRemoteStreams ? definition?.remoteStreams[selectedServer] : definition;

  const context = React.useMemo(
    // useMemo cannot be used conditionally after the definition narrowing, the assertion is to narrow correctly the context value
    () =>
      ({
        definition: currentDefinition,
        loading,
        refresh,
        server: selectedServer || '_local',
      } as StreamDetailContextValue),
    [currentDefinition, loading, refresh, selectedServer]
  );

  // Display loading spinner for first data-fetching only to have SWR-like behaviour
  if (!currentDefinition && loading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center">
        <EuiLoadingSpinner size="xxl" />
      </EuiFlexGroup>
    );
  }

  if (!currentDefinition) {
    return null;
  }

  return (
    <StreamDetailContext.Provider value={context}>
      {hasRemoteStreams && (
        <EuiTabs>
          {Object.entries(definition?.remoteStreams || {}).map(([server, stream]) => {
            if ('error' in stream) {
              return null;
            }
            return (
              <EuiTab
                key={server}
                isSelected={server === selectedServer}
                onClick={() => {
                  setSelectedServer(server);
                }}
              >
                {server}
              </EuiTab>
            );
          })}
        </EuiTabs>
      )}
      {children}
    </StreamDetailContext.Provider>
  );
}

export function useStreamDetail() {
  const ctx = React.useContext(StreamDetailContext);
  if (!ctx) {
    throw new Error('useStreamDetail must be used within a StreamDetailContextProvider');
  }
  return ctx;
}
