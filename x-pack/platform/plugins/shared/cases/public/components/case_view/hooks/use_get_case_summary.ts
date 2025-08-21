/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';
import { CASES_INTERNAL_URL } from '../../../../common/constants';
import { useKibana } from '../../../common/lib/kibana';

interface UseGetCaseSummaryApiOptions {
  caseId: string;
  connectorId?: string;
}

export function useGetCaseSummary() {
  const { http } = useKibana().services;
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<string>('');
  const [error, setError] = useState<Error | null>(null);

  const getCaseSummary = useCallback(
    async ({ caseId, connectorId }: UseGetCaseSummaryApiOptions) => {
      const apiPath = `${CASES_INTERNAL_URL}/${caseId}/summary`;
      setIsLoading(true);
      setError(null);
      try {
        const response = await http.get<string>(apiPath, {
          query: {
            connectorId,
          },
        });
        setSummary(response);
      } catch (err) {
        setError(err as Error);
        setSummary('');
      } finally {
        setIsLoading(false);
      }
    },
    [http]
  );

  return { isLoading, summary, error, getCaseSummary };
}
