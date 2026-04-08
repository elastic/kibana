/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import { ESQL_VIEW_PREFIX, Streams } from '@kbn/streams-schema';
import { useKibana } from './use_kibana';

export interface QueryStreamHint {
  indexName: string;
  suggestedView: string;
}

/**
 * Detects "Unknown index [name]" ES|QL errors where the index is actually a
 * query stream that needs the `$.` prefix. Makes an API call to confirm the
 * stream exists and is a query stream before returning the hint.
 */
export const useQueryStreamHint = (error: Error | undefined): QueryStreamHint | undefined => {
  const { streamsRepositoryClient } = useKibana().dependencies.start.streams;

  const unknownIndexName = useMemo(() => {
    if (!error?.message) return undefined;
    const match = error.message.match(/Unknown index \[([^\]]+)\]/);
    if (!match || match[1].startsWith(ESQL_VIEW_PREFIX)) return undefined;
    return match[1];
  }, [error]);

  const [confirmedQueryStreamName, setConfirmedQueryStreamName] = useState<string>();

  useEffect(() => {
    if (!unknownIndexName) {
      setConfirmedQueryStreamName(undefined);
      return;
    }
    const abortController = new AbortController();
    streamsRepositoryClient
      .fetch('GET /api/streams/{name} 2023-10-31', {
        params: { path: { name: unknownIndexName } },
        signal: abortController.signal,
      })
      .then((response) => {
        if (!abortController.signal.aborted && Streams.QueryStream.Definition.is(response.stream)) {
          setConfirmedQueryStreamName(unknownIndexName);
        }
      })
      .catch(() => {
        if (!abortController.signal.aborted) {
          setConfirmedQueryStreamName(undefined);
        }
      });
    return () => {
      abortController.abort();
    };
  }, [unknownIndexName, streamsRepositoryClient]);

  return confirmedQueryStreamName
    ? {
        indexName: confirmedQueryStreamName,
        suggestedView: `${ESQL_VIEW_PREFIX}${confirmedQueryStreamName}`,
      }
    : undefined;
};
