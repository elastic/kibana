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

  const { datasetUserPrivileges } = useSelector(service, (state) => state.context) ?? {};

  const statsLoading = useSelector(service, (state) => state.matches('stats.datasets.fetching'));

  const canUserReadFailureStore = Boolean(datasetUserPrivileges?.canReadFailureStore);

  return {
    statsLoading,
    canUserReadFailureStore,
  };
};
