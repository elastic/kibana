/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useEffect, useState } from 'react';

import { User } from '../../../../../../plugins/case/common/api';
import { errorToToaster, useStateToaster } from '../../components/toasters';
import { getReporters } from './api';
import * as i18n from './translations';

interface ReportersState {
  reporters: string[];
  respReporters: User[];
  isLoading: boolean;
  isError: boolean;
}

const initialData: ReportersState = {
  reporters: [],
  respReporters: [],
  isLoading: true,
  isError: false,
};

interface UseGetReporters extends ReportersState {
  fetchReporters: () => void;
}

export const useGetReporters = (): UseGetReporters => {
  const [reportersState, setReporterState] = useState<ReportersState>(initialData);

  const [, dispatchToaster] = useStateToaster();

  const fetchReporters = useCallback(() => {
    let didCancel = false;
    const abortCtrl = new AbortController();
    const fetchData = async () => {
      setReporterState({
        ...reportersState,
        isLoading: true,
      });
      try {
        const response = await getReporters(abortCtrl.signal);
        if (!didCancel) {
          setReporterState({
            reporters: response.map(r => r.full_name ?? r.username ?? 'N/A'),
            respReporters: response,
            isLoading: true,
            isError: false,
          });
        }
      } catch (error) {
        if (!didCancel) {
          errorToToaster({
            title: i18n.ERROR_TITLE,
            error: error.body && error.body.message ? new Error(error.body.message) : error,
            dispatchToaster,
          });
          setReporterState({
            reporters: [],
            respReporters: [],
            isLoading: false,
            isError: true,
          });
        }
      }
    };
    fetchData();
    return () => {
      didCancel = true;
      abortCtrl.abort();
    };
  }, [reportersState]);

  useEffect(() => {
    fetchReporters();
  }, []);
  return { ...reportersState, fetchReporters };
};
