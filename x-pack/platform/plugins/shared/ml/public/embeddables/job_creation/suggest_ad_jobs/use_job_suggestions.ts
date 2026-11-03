/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ErrorType } from '@kbn/ml-error-utils';
import type { JobSuggestion } from '../../../../common/types/job_suggestions';
import { useMlKibana } from '../../../application/contexts/kibana';
import { useJobsApiService } from '../../../application/services/ml_api_service/jobs';

export interface SuggestionTimeRange {
  from: string;
  to: string;
}

export const DEFAULT_SUGGESTION_TIME_RANGE: SuggestionTimeRange = { from: 'now-30d', to: 'now' };

export type SuggestionsState =
  | { status: 'loading' }
  | { status: 'error'; error: ErrorType }
  | { status: 'loaded'; suggestions: JobSuggestion[] };

/**
 * Asks for suggested jobs when the index pattern or time range changes, and when reloaded.
 * The answer to a request which has been superseded is ignored.
 */
export const useJobSuggestions = (indexPattern: string, timeRange: SuggestionTimeRange) => {
  const {
    services: {
      data: {
        query: {
          timefilter: { timefilter },
        },
      },
    },
  } = useMlKibana();
  const jobsApi = useJobsApiService();
  const [state, setState] = useState<SuggestionsState>({ status: 'loading' });
  const [reloadCount, setReloadCount] = useState(0);
  const latestRequest = useRef(0);

  useEffect(() => {
    const requestId = ++latestRequest.current;
    const isCurrent = () => requestId === latestRequest.current;

    const { min, max } = timefilter.calculateBounds(timeRange);
    const start = min?.valueOf();
    const end = max?.valueOf();
    if (start === undefined || end === undefined || start >= end) {
      setState({ status: 'error', error: 'The time range is not valid.' });
      return;
    }

    setState({ status: 'loading' });
    jobsApi
      .suggestJobs({ index: indexPattern, start, end })
      .then(({ suggestions }) => isCurrent() && setState({ status: 'loaded', suggestions }))
      .catch((error) => isCurrent() && setState({ status: 'error', error }));
  }, [jobsApi, timefilter, indexPattern, timeRange, reloadCount]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);

  return { state, reload };
};
