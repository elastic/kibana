/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useToasts } from '../common/lib/kibana';
import { getCaseSummary } from './api';
import type { ServerError } from '../types';
import { ERROR_TITLE } from './translations';
import { casesQueriesKeys } from './constants';
import type { CaseSummary } from './types';

export const useGetCaseSummary = (caseId: string, connectorId: string) => {
  const toasts = useToasts();
  return useQuery<CaseSummary, ServerError>(
    casesQueriesKeys.caseSummary(caseId, connectorId),
    async ({ signal }) => getCaseSummary(caseId, connectorId, signal),
    {
      onError: (error: ServerError) => {
        if (error.name !== 'AbortError') {
          toasts.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            { title: ERROR_TITLE }
          );
        }
      },
      enabled: false,
      refetchOnWindowFocus: false,
    }
  );
};

export type UseGetCaseSummary = ReturnType<typeof useGetCaseSummary>;
