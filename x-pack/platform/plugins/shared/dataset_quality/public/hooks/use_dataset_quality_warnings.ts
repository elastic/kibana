/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useSelector } from '@xstate/react';
import { useDatasetQualityContext } from '../components/dataset_quality/context';

export function useDatasetQualityWarnings() {
  const { service } = useDatasetQualityContext();

  const nonAggregatableDatasets = useSelector(
    service,
    (state) => state.context.nonAggregatableDatasets
  );

  const isNonAggregatableDatasetsLoading = useSelector(service, (state) =>
    state.matches({ main: { stats: { nonAggregatableDatasets: 'fetching' } } })
  );

  return {
    loading: isNonAggregatableDatasetsLoading,
    nonAggregatableDatasets,
  };
}
