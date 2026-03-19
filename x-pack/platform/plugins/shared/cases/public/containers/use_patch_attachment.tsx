/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import { useCasesToast } from '../common/use_cases_toast';
import { useRefreshCaseViewPage } from '../components/case_view/use_on_refresh_case_view_page';
import type { ServerError } from '../types';
import { patchAttachment } from './api';
import { casesMutationsKeys } from './constants';
import type { AttachmentPatchRequestV2 } from '../../common/types/api';
import * as i18n from './translations';

interface PatchAttachmentParams {
  caseId: string;
  payload: AttachmentPatchRequestV2;
}

export const usePatchAttachment = () => {
  const { showErrorToast } = useCasesToast();
  const refreshCaseViewPage = useRefreshCaseViewPage();

  return useMutation(
    ({ caseId, payload }: PatchAttachmentParams) =>
      patchAttachment({
        caseId,
        payload,
      }),
    {
      mutationKey: casesMutationsKeys.patchAttachment,
      onSuccess: () => {
        refreshCaseViewPage();
      },
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
    }
  );
};

export type UsePatchAttachment = ReturnType<typeof usePatchAttachment>;
