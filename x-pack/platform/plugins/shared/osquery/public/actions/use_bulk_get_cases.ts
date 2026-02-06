/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { CasesBulkGetResponse } from '@kbn/cases-plugin/common';
import { INTERNAL_BULK_GET_CASES_URL } from '@kbn/cases-plugin/common';
import { useKibana } from '../common/lib/kibana';

export interface CaseInfo {
  id: string;
  title: string;
  status: string;
}

export type CasesMap = Map<string, CaseInfo>;

export const useBulkGetCases = (caseIds: string[]) => {
  const { http } = useKibana().services;
  const uniqueIds = [...new Set(caseIds)];

  return useQuery(
    ['bulkGetCases', uniqueIds],
    async (): Promise<CasesMap> => {
      if (uniqueIds.length === 0) {
        return new Map();
      }

      const response = await http.post<CasesBulkGetResponse>(INTERNAL_BULK_GET_CASES_URL, {
        body: JSON.stringify({ ids: uniqueIds }),
        version: '1',
      });

      const casesMap: CasesMap = new Map();

      for (const caseItem of response.cases) {
        casesMap.set(caseItem.id, {
          id: caseItem.id,
          title: caseItem.title,
          status: caseItem.status,
        });
      }

      return casesMap;
    },
    {
      enabled: uniqueIds.length > 0,
      keepPreviousData: true,
      staleTime: 30000,
    }
  );
};
