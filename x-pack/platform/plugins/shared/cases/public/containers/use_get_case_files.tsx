/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileJSON } from '@kbn/shared-ux-file-types';
import type { UseQueryResult } from '@kbn/react-query';

import { useQuery } from '@kbn/react-query';

import type { ServerError } from '../types';

import { useCasesToast } from '../common/use_cases_toast';
import { casesQueriesKeys } from './constants';
import * as i18n from './translations';
import { getCaseFiles } from './api';

export interface CaseFilesFilteringOptions {
  page: number;
  perPage: number;
  searchTerm?: string;
}

export interface GetCaseFilesParams extends CaseFilesFilteringOptions {
  caseId: string;
}

export const useGetCaseFiles = ({
  caseId,
  page,
  perPage,
  searchTerm,
}: GetCaseFilesParams): UseQueryResult<{ files: FileJSON[]; total: number }> => {
  const { showErrorToast } = useCasesToast();

  return useQuery(
    casesQueriesKeys.caseFiles(caseId, { page, perPage, searchTerm }),
    ({ signal }) => {
      return getCaseFiles({
        caseId,
        page: page + 1,
        perPage,
        searchTerm,
        signal,
      });
    },
    {
      keepPreviousData: true,
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
    }
  );
};
