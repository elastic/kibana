/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from '@xstate/react';
import { useDatasetQualityContext } from '../components/dataset_quality/context';

export const useDatasetQualityState = () => {
  const { service } = useDatasetQualityContext();

  const { datasetUserPrivileges, dataStreamStats } =
    useSelector(service, (state) => state.context) ?? {};

  const statsLoading = useSelector(
    service,
    (state) =>
      state.matches('initializing') || state.matches({ main: { stats: { datasets: 'fetching' } } })
  );

  const canUserReadFailureStore = Boolean(
    dataStreamStats?.some((dataStream) => dataStream.userPrivileges.canReadFailureStore) ||
      Object.values(datasetUserPrivileges?.datasetsPrivilages ?? {})?.some(
        (privilege) => privilege.canReadFailureStore
      )
  );

  const canUserMonitorAnyDataset = Boolean(
    dataStreamStats?.some((dataStream) => dataStream.userPrivileges.canMonitor)
  );

  const canUserReadAnyDataset = Boolean(
    Object.values(datasetUserPrivileges?.datasetsPrivilages ?? {})?.some(
      (privilege) => privilege.canRead
    )
  );

  const canUserAccessAnyDataset =
    Boolean(dataStreamStats?.length) ||
    canUserReadAnyDataset ||
    Object.values(datasetUserPrivileges?.datasetsPrivilages ?? {}).some(
      (privilege) => privilege.canMonitor
    );

  return {
    // Whether concrete data stream discovery and statistics are still loading.
    statsLoading,
    // Whether failure-store data is readable for any concrete stream or requested dataset pattern.
    canUserReadFailureStore,
    // Whether at least one discovered concrete data stream grants the monitor privilege.
    canUserMonitorAnyDataset,
    // Whether the user has any concrete stream or broad read/monitor access to the requested data.
    canUserAccessAnyDataset,
  };
};
