/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import {
  getSelectedJobId$,
  getShowAnomalies$,
  setSelectedJobId,
  setShowAnomalies,
} from './selected_job';

/** The id of the job selected for the index pattern, or undefined when there is none, and a function to change it. */
export const useSelectedJobId = (
  indexPattern: string
): readonly [string | undefined, (jobId: string | undefined) => void] => {
  const selectedJobId$ = useMemo(() => getSelectedJobId$(indexPattern), [indexPattern]);
  const selectedJobId = useObservable(selectedJobId$, selectedJobId$.getValue());
  const selectJob = useCallback(
    (jobId: string | undefined) => setSelectedJobId(indexPattern, jobId),
    [indexPattern]
  );
  return [selectedJobId, selectJob] as const;
};

/** Whether the anomalies of the selected job are shown on the chart for the index pattern, and a function to change it. */
export const useShowAnomalies = (
  indexPattern: string
): readonly [boolean, (show: boolean) => void] => {
  const showAnomalies$ = useMemo(() => getShowAnomalies$(indexPattern), [indexPattern]);
  const showAnomalies = useObservable(showAnomalies$, showAnomalies$.getValue());
  const setShow = useCallback(
    (show: boolean) => setShowAnomalies(indexPattern, show),
    [indexPattern]
  );
  return [showAnomalies, setShow] as const;
};
