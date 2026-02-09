/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import { type MaintenanceWindowStatus } from '../../common';
import { useKibana } from '../utils/kibana_react';
import { findMaintenanceWindows } from '../services/find';

interface UseFindMaintenanceWindowsProps {
  enabled?: boolean;
  page: number;
  perPage: number;
  search: string;
  selectedStatus: MaintenanceWindowStatus[];
}

export const useFindMaintenanceWindows = (params: UseFindMaintenanceWindowsProps) => {
  const { enabled = true, page, perPage, search, selectedStatus } = params;

  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const queryFn = () => {
    return findMaintenanceWindows({
      http,
      page,
      perPage,
      search,
      selectedStatus,
    });
  };

  const onErrorFn = (error: Error) => {
    if (error) {
      toasts.addDanger(
        i18n.translate('xpack.maintenanceWindows.listFailure', {
          defaultMessage: 'Unable to load maintenance windows.',
        })
      );
    }
  };

  const queryKey = ['findMaintenanceWindows', page, perPage, search, selectedStatus];

  const { isLoading, isFetching, isInitialLoading, data, refetch } = useQuery({
    queryKey,
    queryFn,
    onError: onErrorFn,
    refetchOnWindowFocus: false,
    retry: false,
    cacheTime: 0,
    enabled,
    placeholderData: { maintenanceWindows: [], total: 0 },
    keepPreviousData: true,
  });

  return {
    data,
    isLoading: enabled && (isLoading || isFetching),
    isInitialLoading,
    refetch,
  };
};
