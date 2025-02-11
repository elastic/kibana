/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileJSON } from '@kbn/shared-ux-file-types';
import type { UseQueryResult } from '@tanstack/react-query';

import { useFilesContext } from '@kbn/shared-ux-file-context';
import { useQuery } from '@tanstack/react-query';

import type { Owner } from '../../common/constants/types';
import type { ServerError } from '../types';

import { constructFileKindIdByOwner } from '../../common/files';
import { useCasesToast } from '../common/use_cases_toast';
import { casesQueriesKeys } from './constants';
import * as i18n from './translations';
import { useCasesContext } from '../components/cases_context/use_cases_context';

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
  const { owner } = useCasesContext();
  const { showErrorToast } = useCasesToast();
  const { client: filesClient } = useFilesContext();

  return useQuery(
    casesQueriesKeys.caseFiles(caseId, { page, perPage, searchTerm }),
    () => {
      return filesClient.list({
        kind: constructFileKindIdByOwner(owner[0] as Owner),
        page: page + 1,
        ...(searchTerm && { name: `*${searchTerm}*` }),
        perPage,
        meta: { caseIds: [caseId] },
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
