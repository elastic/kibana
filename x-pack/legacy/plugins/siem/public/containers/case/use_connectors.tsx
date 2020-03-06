/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { noop } from 'lodash/fp';
import { useState, useEffect, useRef } from 'react';
import { fetchConnectors } from './api';

import { errorToToaster } from '../../components/ml/api/error_to_toaster';
import { useStateToaster } from '../../components/toasters';
import * as i18n from './translations';
import { Connector } from './types';

export interface ReturnConnectors {
  loading: boolean;
  connectors: Connector[];
  refetchConnectors: () => void;
}

export const useConnectors = (): ReturnConnectors => {
  const [, dispatchToaster] = useStateToaster();
  const [loading, setLoading] = useState(true);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const refetchConnectors = useRef<() => void>(noop);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetchConnectors({ signal: abortCtrl.signal });
        if (isSubscribed) {
          setConnectors(res.data);
        }
      } catch (error) {
        if (isSubscribed) {
          setConnectors([]);
          errorToToaster({
            title: i18n.ERROR_TITLE,
            error: error.body && error.body.message ? new Error(error.body.message) : error,
            dispatchToaster,
          });
        }
      }

      if (isSubscribed) {
        setLoading(false);
      }
    };
    refetchConnectors.current = fetchData;
    fetchData();

    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, []);

  return {
    loading,
    connectors,
    refetchConnectors: refetchConnectors.current,
  };
};
