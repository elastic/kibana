/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import type { SingleCaseMetricsFeature } from './types';
import { useToasts } from '../common/lib/kibana';
import { getSingleCaseMetrics } from './api';
import type { ServerError } from '../types';
import { ERROR_TITLE } from './translations';
import { casesQueriesKeys } from './constants';

export const useGetCaseMetrics = (caseId: string, features: SingleCaseMetricsFeature[]) => {
  const toasts = useToasts();
  return useQuery(
    casesQueriesKeys.caseMetrics(caseId, features),
    async ({ signal }) => ({
      metrics: await getSingleCaseMetrics(caseId, features, signal),
    }),
    {
      onError: (error: ServerError) => {
        if (error.name !== 'AbortError') {
          toasts.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            { title: ERROR_TITLE }
          );
        }
      },
    }
  );
};
