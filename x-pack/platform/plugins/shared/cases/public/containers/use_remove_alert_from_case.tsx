/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import { casesMutationsKeys } from './constants';
import type { ServerError } from '../types';
import { useRefreshCaseViewPage } from '../components/case_view/use_on_refresh_case_view_page';
import { useCasesToast } from '../common/use_cases_toast';
import { removeAlertFromComment } from './api';
import * as i18n from './translations';
import { useGetCase } from './use_get_case';
import type { AttachmentUI, AlertAttachmentUI } from './types';

interface MutationArgs {
  alertId: string;
  successToasterTitle: string;
}

export type UseRemoveAlertFromCase = (caseId: string) => ReturnType<typeof useRemoveAlertFromCase>;

export const useRemoveAlertFromCase = (caseId: string) => {
  const { showErrorToast, showSuccessToast } = useCasesToast();
  const refreshCaseViewPage = useRefreshCaseViewPage();

  const { data: caseData } = useGetCase(caseId);
  const attachments = caseData?.case?.comments ?? [];

  return useMutation(
    ({ alertId }: MutationArgs) => {
      const alertAttachment = attachments.find((attachment) => {
        if ('alertId' in attachment && isAlertAttachment(attachment)) {
          return attachment.alertId.includes(alertId);
        }
        return false;
      });
      if (!alertAttachment || isAlertAttachment(alertAttachment) === false) {
        throw new Error('Alert attachment not found');
      }

      return removeAlertFromComment({
        caseId,
        alertId,
        alertAttachment: {
          ...alertAttachment,
          created_at: alertAttachment.createdAt,
          created_by: {
            ...alertAttachment.createdBy,
            full_name: alertAttachment.createdBy.fullName,
          },
          updated_at: alertAttachment.updatedAt,
          updated_by: alertAttachment.updatedBy
            ? {
                ...alertAttachment.updatedBy,
                full_name: alertAttachment.updatedBy.fullName,
              }
            : null,
          pushed_at: alertAttachment.pushedAt ?? null,
          pushed_by: alertAttachment.pushedBy
            ? {
                ...alertAttachment.pushedBy,
                full_name: alertAttachment.pushedBy.fullName,
              }
            : null,
        },
      });
    },
    {
      mutationKey: [casesMutationsKeys.deleteComment, casesMutationsKeys.updateComment],
      onSuccess: (_, { successToasterTitle }) => {
        showSuccessToast(successToasterTitle);
        refreshCaseViewPage();
      },
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
    }
  );
};

export function isAlertAttachment(obj: AttachmentUI): obj is AlertAttachmentUI {
  if (!obj || typeof obj !== 'object') return false;
  // Adjust these checks based on the actual AlertAttachment structure
  return obj.type === 'alert';
}
