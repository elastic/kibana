/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { SetStateAction, useEffect, useState } from 'react';

import { fetchQuerySignals } from './api';
import { SignalSearchResponse } from './types';

type Return<Hit, Aggs> = [
  boolean,
  SignalSearchResponse<Hit, Aggs> | null,
  React.Dispatch<SetStateAction<object>>
];

/**
 * Hook for using to get a Signals from the Detection Engine API
 *
 * @param initialQuery query dsl object
 *
 */
export const useQuerySignals = <Hit, Aggs>(initialQuery: object): Return<Hit, Aggs> => {
  const [query, setQuery] = useState(initialQuery);
  const [signals, setSignals] = useState<SignalSearchResponse<Hit, Aggs> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();
    setLoading(true);

    async function fetchData() {
      try {
        const signalResponse = await fetchQuerySignals<Hit, Aggs>({
          query,
          signal: abortCtrl.signal,
        });

        if (isSubscribed) {
          setSignals(signalResponse);
        }
      } catch (error) {
        if (isSubscribed) {
          setSignals(null);
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
  }, [query]);

  return [loading, signals, setQuery];
};
