/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { map } from 'rxjs';
import type { Observable } from 'rxjs';
import type { StreamSuggestion } from '@kbn/streams-ai';
import { useKibana } from './use_kibana';

export type { StreamSuggestion };

export function useStreamsSuggestionsApi() {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  return useMemo(
    () => ({
      streamSuggestions: ({
        streamName,
        connectorId,
        start,
        end,
        signal,
      }: {
        streamName: string;
        connectorId: string;
        start: number;
        end: number;
        signal: AbortSignal;
      }): Observable<StreamSuggestion | null> => {
        return streamsRepositoryClient
          .stream('POST /internal/streams/{name}/_suggestions', {
            signal,
            params: {
              path: { name: streamName },
              body: {
                connector_id: connectorId,
                start,
                end,
              },
            },
          })
          .pipe(map((event) => event.suggestion));
      },
    }),
    [streamsRepositoryClient]
  );
}
