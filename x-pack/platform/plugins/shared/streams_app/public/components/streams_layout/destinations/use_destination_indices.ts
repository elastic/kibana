/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import { useKibana } from '../../../hooks/use_kibana';
import { getDestinationWritePatterns } from './destination_models';
import type { DestinationViewModel } from './types';

export type DestinationIndicesStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface DestinationIndicesState {
  status: DestinationIndicesStatus;
  indices: string[];
  error?: string;
}

const IDLE_STATE: DestinationIndicesState = { status: 'idle', indices: [] };

export const useDestinationIndices = (
  destination: DestinationViewModel | undefined,
  enabled: boolean
): DestinationIndicesState => {
  const {
    dependencies: {
      start: { streams },
    },
  } = useKibana();
  const [state, setState] = useState<DestinationIndicesState>(IDLE_STATE);

  const writePatterns = useMemo(
    () => (destination ? getDestinationWritePatterns(destination) : []),
    [destination]
  );
  const requestKey = destination
    ? `${destination.id}:${destination.mode}:${writePatterns.join(',')}`
    : '';

  useEffect(() => {
    if (!enabled || !destination) {
      setState(IDLE_STATE);
      return;
    }
    if (writePatterns.length === 0) {
      setState({ status: 'ready', indices: [] });
      return;
    }

    const abortController = new AbortController();
    setState({ status: 'loading', indices: [] });
    streams.streamsRepositoryClient
      .fetch('POST /internal/streams/_resolve_index_patterns', {
        signal: abortController.signal,
        params: { body: { patterns: writePatterns } },
      })
      .then((response) => {
        if (!abortController.signal.aborted) {
          setState({ status: 'ready', indices: response.indices });
        }
      })
      .catch((error: unknown) => {
        if (abortController.signal.aborted) {
          return;
        }
        setState({
          status: 'error',
          indices: [],
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      abortController.abort();
    };
  }, [destination, enabled, requestKey, streams.streamsRepositoryClient, writePatterns]);

  return state;
};
