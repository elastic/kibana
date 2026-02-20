/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { EuiFlexGroup, EuiLoadingSpinner } from '@elastic/eui';
import { Streams } from '@kbn/streams-schema';
import { STREAMS_UI_PRIVILEGES } from '@kbn/streams-plugin/public';
import { getAncestorsAndSelf, getSegments } from '@kbn/streams-schema';
import { isHttpFetchError } from '@kbn/server-route-repository-client';
import { useStreamsAppFetch } from './use_streams_app_fetch';
import { useStreamsAppBreadcrumbs } from './use_streams_app_breadcrumbs';
import { useStreamsAppParams } from './use_streams_app_params';
import { useKibana } from './use_kibana';
import { StreamNotFoundPrompt } from '../components/stream_not_found_prompt';

export interface StreamDetailContextProviderProps {
  name: string;
  streamsRepositoryClient: StreamsRepositoryClient;
}

export interface StreamDetailContextValue {
  definition: Streams.all.GetResponse;
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
    error,
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

          if (Streams.QueryStream.GetResponse.is(response)) {
            return response;
          }

          throw new Error('Stream detail only supports Ingest and Query streams.');
        });
    },
    [streamsRepositoryClient, name, canManage]
  );

  const {
    path: { key },
  } = useStreamsAppParams('/{key}', true);

  useStreamsAppBreadcrumbs(() => {
    if (!definition || !Streams.WiredStream.Definition.is(definition.stream)) {
      return [{ title: key, path: `/{key}`, params: { path: { key } } }];
    }
    // Build breadcrumbs for each segment in the hierarchy for wired streams
    const ids = getAncestorsAndSelf(key);
    const segments = getSegments(key);
    return ids.map((id, idx) => ({
      title: segments[idx],
      path: `/{key}`,
      params: { path: { key: id } },
    }));
  }, [key, definition]);

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

  if (!definition && error && isHttpFetchError(error) && error.body?.statusCode === 404) {
    return <StreamNotFoundPrompt streamName={name} />;
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

export function useStreamDetailAsIngestStream() {
  const ctx = useStreamDetail();
  if (
    !Streams.WiredStream.GetResponse.is(ctx.definition) &&
    !Streams.ClassicStream.GetResponse.is(ctx.definition)
  ) {
    throw new Error('useStreamDetailAsIngestStream can only be used with IngestStreams');
  }
  return ctx as {
    definition: Streams.ingest.all.GetResponse;
    loading: boolean;
    refresh: () => void;
  };
}
