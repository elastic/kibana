/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';

import { useUiSetting$ } from '../../../lib/kibana';
import { DEFAULT_KBN_VERSION } from '../../../../common/constants';

import { fetchQuerySignals } from './api';
import { SignalSearchResponse } from './types';

type Return<Hit, Aggs> = [boolean, SignalSearchResponse<Hit, Aggs> | null];

/**
 * Hook for using to get a Signals from the Detection Engine API
 *
 * @param query convert a dsl into string
 *
 */
export const useQuerySignals = <Hit, Aggs>(query: string): Return<Hit, Aggs> => {
  const [signals, setSignals] = useState<SignalSearchResponse<Hit, Aggs> | null>(null);
  const [loading, setLoading] = useState(true);
  const [kbnVersion] = useUiSetting$<string>(DEFAULT_KBN_VERSION);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();
    setLoading(true);

    async function fetchData() {
      try {
        const signalResponse = await fetchQuerySignals<Hit, Aggs>({
          query,
          kbnVersion,
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

  return [loading, signals];
};
