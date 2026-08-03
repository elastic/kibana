/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import type { HttpSetup } from '@kbn/core/public';
import { API_BASE_PATH } from '../../common/constants';
import type { ClusterDetails } from '../types';

export interface UseCloudConnectStatusResult {
  isCloudConnected: boolean;
  isCloudConnectEisEnabled: boolean;
  isCloudConnectAutoopsEnabled: boolean;
  isLoading: boolean;
  error: Error | null;
}

export type UseCloudConnectStatusHook = () => UseCloudConnectStatusResult;

export const createUseCloudConnectStatusHook = ({
  http,
}: {
  http: HttpSetup;
}): UseCloudConnectStatusHook => {
  return () => {
    const [{ error, loading, value }, load] = useAsyncFn(async () => {
      try {
        return await http.get<ClusterDetails>(`${API_BASE_PATH}/cluster_details`);
      } catch (err) {
        // 503 means not connected to cloud, so not really an error state
        if (err?.response?.status === 503) {
          return null;
        }
        throw err;
      }
    });

    useEffect(() => {
      load();
    }, [load]);

    return {
      isCloudConnected: value != null,
      isCloudConnectEisEnabled: value?.services?.eis?.enabled ?? false,
      isCloudConnectAutoopsEnabled: value?.services?.auto_ops?.enabled ?? false,
      isLoading: loading,
      error: error ?? null,
    };
  };
};
