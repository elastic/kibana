/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect } from 'react';
import { fetchConnectors } from './api';
import { Connector } from './types';

export type ReturnConnectors = [boolean];

export interface UseConnectors {
  dispatchConnectors: (connectors: Connector[]) => void;
}

export const useConnectors = ({ dispatchConnectors }: UseConnectors): ReturnConnectors => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetchConnectors({ signal: abortCtrl.signal });

        if (isSubscribed) {
          dispatchConnectors(res.data);
        }
      } catch (error) {
        if (isSubscribed) {
          dispatchConnectors([]);
        }
      }

      if (isSubscribed) {
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, []);

  return [loading];
};
