/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import type { BulkDeleteAttachmentsRequest } from '../../common/types/api';
import { bulkDeleteAttachments } from './api';
import * as i18n from './translations';
import type { ServerError } from '../types';
import { useCasesToast } from '../common/use_cases_toast';
import { casesMutationsKeys } from './constants';
import { useRefreshCaseViewPage } from '../components/case_view/use_on_refresh_case_view_page';

export interface BulkDeleteAttachmentsVariables {
  request: BulkDeleteAttachmentsRequest;
  /** Counted noun shown in the success toast, e.g. "2 files". */
  countLabel: string;
  includeRelated?: boolean;
}

export const useBulkDeleteAttachments = (caseId: string) => {
  const { showErrorToast, showSuccessToast } = useCasesToast();
  const refreshCaseViewPage = useRefreshCaseViewPage();

  return useMutation(
    ({ request, includeRelated }: BulkDeleteAttachmentsVariables) =>
      bulkDeleteAttachments({ caseId, request, includeRelated }),
    {
      mutationKey: casesMutationsKeys.bulkDeleteAttachments,
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_DELETING });
      },
      onSuccess: (_, { countLabel }) => {
        showSuccessToast(i18n.ATTACHMENTS_REMOVED(countLabel));
      },
      // A failed request can still remove part of the ids, so the case view refreshes either way.
      onSettled: () => {
        refreshCaseViewPage();
      },
    }
  );
};

export type UseBulkDeleteAttachments = ReturnType<typeof useBulkDeleteAttachments>;
