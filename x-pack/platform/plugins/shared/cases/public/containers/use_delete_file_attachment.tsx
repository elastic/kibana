/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { casesMutationsKeys, casesQueriesKeys } from './constants';
import type { ServerError } from '../types';
import { useRefreshCaseViewPage } from '../components/case_view/use_on_refresh_case_view_page';
import { useCasesToast } from '../common/use_cases_toast';
import { deleteFileAttachments } from './api';
import * as i18n from './translations';

interface MutationArgs {
  caseId: string;
  fileId: string;
}

export const useDeleteFileAttachment = () => {
  const queryClient = useQueryClient();
  const { showErrorToast, showSuccessToast } = useCasesToast();
  const refreshAttachmentsTable = useRefreshCaseViewPage();

  return useMutation(
    ({ caseId, fileId }: MutationArgs) => deleteFileAttachments({ caseId, fileIds: [fileId] }),
    {
      mutationKey: casesMutationsKeys.deleteFileAttachment,
      onMutate: async ({ caseId }) => {
        // caseFileStats(id, params) = [...case(id), 'files', 'stats', params]
        // Drop the trailing `params` segment to get a prefix that matches all
        // file-stats queries for this case regardless of search term.
        const statsKey = casesQueriesKeys.caseFileStats(caseId).slice(0, -1);

        await queryClient.cancelQueries(statsKey);

        const previousStats = queryClient.getQueriesData<{ total: number }>(statsKey);

        queryClient.setQueriesData<{ total: number }>(statsKey, (old) =>
          old ? { total: Math.max(0, old.total - 1) } : old
        );

        return { previousStats };
      },
      onSuccess: () => {
        showSuccessToast(i18n.FILE_DELETE_SUCCESS);
        refreshAttachmentsTable();
      },
      onError: (error: ServerError, _variables, context) => {
        if (context?.previousStats) {
          for (const [key, data] of context.previousStats) {
            queryClient.setQueryData(key, data);
          }
        }
        showErrorToast(error, { title: i18n.ERROR_DELETING_FILE });
      },
    }
  );
};
