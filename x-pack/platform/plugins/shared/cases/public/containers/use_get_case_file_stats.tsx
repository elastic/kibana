/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@kbn/react-query';

import type { FileJSON } from '@kbn/shared-ux-file-types';

import { useQuery } from '@kbn/react-query';

import type { ServerError } from '../types';

import { useCasesToast } from '../common/use_cases_toast';
import { casesQueriesKeys } from './constants';
import * as i18n from './translations';
import { getCaseFiles } from './api';

const getTotalFromFileList = (data: { files: FileJSON[]; total: number }): { total: number } => ({
  total: data.total,
});

interface GetCaseFileStatsParams {
  caseId: string;
  searchTerm?: string;
}

export const useGetCaseFileStats = ({
  caseId,
  searchTerm,
}: GetCaseFileStatsParams): UseQueryResult<{ total: number }> => {
  const { showErrorToast } = useCasesToast();

  return useQuery(
    casesQueriesKeys.caseFileStats(caseId, { searchTerm }),
    ({ signal }) => {
      return getCaseFiles({
        caseId,
        page: 1,
        perPage: 1,
        searchTerm,
        signal,
      });
    },
    {
      select: getTotalFromFileList,
      keepPreviousData: true,
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
    }
  );
};
