/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useObservable from 'react-use/lib/useObservable';
import { useMemo } from 'react';
import { useAnomalyExplorerContext } from '../anomaly_explorer_context';
import { getMergedGroupsAndJobsIds } from '../explorer_utils';

export const useJobSelection = () => {
  const { anomalyExplorerCommonStateService } = useAnomalyExplorerContext();

  const selectedJobs = useObservable(
    anomalyExplorerCommonStateService.selectedJobs$,
    anomalyExplorerCommonStateService.selectedJobs
  );

  const selectedGroups = useObservable(
    anomalyExplorerCommonStateService.selectedGroups$,
    anomalyExplorerCommonStateService.selectedGroups
  );

  const mergedGroupsAndJobsIds = useMemo(
    () => getMergedGroupsAndJobsIds(selectedGroups, selectedJobs),
    [selectedGroups, selectedJobs]
  );

  return {
    selectedJobs,
    selectedGroups,
    mergedGroupsAndJobsIds,
  };
};
