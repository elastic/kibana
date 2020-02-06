/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { SetStateAction, useEffect, useState } from 'react';

import { fetchQuerySignals } from './api';
import { SignalSearchResponse } from './types';

type Func = () => void;

interface Return<Hit, Aggs> {
  loading: boolean;
  data: SignalSearchResponse<Hit, Aggs> | null;
  setQuery: React.Dispatch<SetStateAction<object>>;
  response: string;
  request: string;
  refetch: Func | null;
}

/**
 * Hook for using to get a Signals from the Detection Engine API
 *
 * @param initialQuery query dsl object
 *
 */
export const useQuerySignals = <Hit, Aggs>(
  initialQuery: object,
  indexName?: string | null
): Return<Hit, Aggs> => {
  const [query, setQuery] = useState(initialQuery);
  const [signals, setSignals] = useState<
    Pick<Return<Hit, Aggs>, 'data' | 'setQuery' | 'response' | 'request' | 'refetch'>
  >({
    data: null,
    response: '',
    request: '',
    setQuery,
    refetch: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    async function fetchData() {
      try {
        setLoading(true);
        const signalResponse = await fetchQuerySignals<Hit, Aggs>({
          query,
          signal: abortCtrl.signal,
        });

        if (isSubscribed) {
          setSignals({
            data: signalResponse,
            response: JSON.stringify(signalResponse, null, 2),
            request: JSON.stringify({ index: [indexName] ?? [''], body: query }, null, 2),
            setQuery,
            refetch: fetchData,
          });
        }
      } catch (error) {
        if (isSubscribed) {
          setSignals({
            data: null,
            response: '',
            request: '',
            setQuery,
            refetch: fetchData,
          });
        }
      }
      if (isSubscribed) {
        setLoading(false);
      }
    }

    fetchData();
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [query, indexName]);

  return { loading, ...signals };
};
