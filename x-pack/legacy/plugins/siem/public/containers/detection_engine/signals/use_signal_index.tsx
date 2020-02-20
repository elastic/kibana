/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';

import { errorToToaster } from '../../../components/ml/api/error_to_toaster';
import { useStateToaster } from '../../../components/toasters';
import { createSignalIndex, getSignalIndex } from './api';
import * as i18n from './translations';
import { PostSignalError, SignalIndexError } from './types';

type Func = () => void;

interface Return {
  loading: boolean;
  signalIndexExists: boolean | null;
  signalIndexName: string | null;
  createDeSignalIndex: Func | null;
}

/**
 * Hook for managing signal index
 *
 *
 */
export const useSignalIndex = (): Return => {
  const [loading, setLoading] = useState(true);
  const [signalIndex, setSignalIndex] = useState<
    Pick<Return, 'signalIndexExists' | 'signalIndexName' | 'createDeSignalIndex'>
  >({
    signalIndexExists: null,
    signalIndexName: null,
    createDeSignalIndex: null,
  });
  const [, dispatchToaster] = useStateToaster();

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchData = async () => {
      try {
        setLoading(true);
        const signal = await getSignalIndex({ signal: abortCtrl.signal });

        if (isSubscribed && signal != null) {
          setSignalIndex({
            signalIndexExists: true,
            signalIndexName: signal.name,
            createDeSignalIndex: createIndex,
          });
        }
      } catch (error) {
        if (isSubscribed) {
          setSignalIndex({
            signalIndexExists: false,
            signalIndexName: null,
            createDeSignalIndex: createIndex,
          });
          if (error instanceof SignalIndexError && error.status_code !== 404) {
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
            setSignalIndex({
              signalIndexExists: false,
              signalIndexName: null,
              createDeSignalIndex: createIndex,
            });
            errorToToaster({ title: i18n.SIGNAL_POST_FAILURE, error, dispatchToaster });
          }
        }
      }
      if (isSubscribed && !isFetchingData) {
        setLoading(false);
      }
    };

    fetchData();
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, []);

  return { loading, ...signalIndex };
};
