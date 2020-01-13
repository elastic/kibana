/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState, useRef } from 'react';

import { errorToToaster } from '../../../components/ml/api/error_to_toaster';
import { useStateToaster } from '../../../components/toasters';
import { createPrepackagedRules } from '../rules';
import { createSignalIndex, getSignalIndex } from './api';
import * as i18n from './translations';
import { PostSignalError, SignalIndexError } from './types';

type Func = () => void;

type Return = [boolean, boolean | null, string | null, Func | null];

/**
 * Hook for managing signal index
 *
 *
 */
export const useSignalIndex = (): Return => {
  const [loading, setLoading] = useState(true);
  const [signalIndexName, setSignalIndexName] = useState<string | null>(null);
  const [signalIndexExists, setSignalIndexExists] = useState<boolean | null>(null);
  const createDeSignalIndex = useRef<Func | null>(null);
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchData = async () => {
      try {
        setLoading(true);
        const signal = await getSignalIndex({ signal: abortCtrl.signal });

        if (isSubscribed && signal != null) {
          setSignalIndexName(signal.name);
          setSignalIndexExists(true);
          createPrepackagedRules({ signal: abortCtrl.signal });
        }
      } catch (error) {
        if (isSubscribed) {
          setSignalIndexName(null);
          setSignalIndexExists(false);
          if (error instanceof SignalIndexError && error.statusCode !== 404) {
            errorToToaster({ title: i18n.SIGNAL_GET_NAME_FAILURE, error, dispatchToaster });
          }
        }
      }
      if (isSubscribed) {
        setLoading(false);
      }
    };

    const createIndex = async () => {
      let isFetchingData = false;
      try {
        setLoading(true);
        await createSignalIndex({ signal: abortCtrl.signal });

        if (isSubscribed) {
          isFetchingData = true;
          fetchData();
        }
      } catch (error) {
        if (isSubscribed) {
          if (error instanceof PostSignalError && error.statusCode === 409) {
            fetchData();
          } else {
            setSignalIndexName(null);
            setSignalIndexExists(false);
            errorToToaster({ title: i18n.SIGNAL_POST_FAILURE, error, dispatchToaster });
          }
        }
      }
      if (isSubscribed && !isFetchingData) {
        setLoading(false);
      }
    };

    fetchData();
    createDeSignalIndex.current = createIndex;
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, []);

  return [loading, signalIndexExists, signalIndexName, createDeSignalIndex.current];
};
