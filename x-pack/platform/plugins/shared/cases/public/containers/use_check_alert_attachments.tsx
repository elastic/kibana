/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { findCaseUserActions } from './api';
import type { ServerError } from '../types';
import { useCasesToast } from '../common/use_cases_toast';
import { ERROR_TITLE } from './translations';
import { casesQueriesKeys } from './constants';
import type { CaseUI } from '../common/ui/types';
import { AttachmentType } from '../../common/types/domain';

export interface UseCheckAlertAttachmentsProps {
  cases: CaseUI[];
  alertIds: string[];
  isEnabled: boolean;
}

export const useCheckAlertAttachments = ({
  cases,
  alertIds,
  isEnabled,
}: UseCheckAlertAttachmentsProps) => {
  const { showErrorToast } = useCasesToast();

  const queries = cases.map((theCase) =>
    useQuery(
      casesQueriesKeys.caseUserActions(theCase.id, {
        type: 'all',
        sortOrder: 'desc',
        page: 1,
        perPage: 1000, // Get all attachments to check for alerts
      }),
      async ({ signal }) => findCaseUserActions(theCase.id, {
        type: 'all',
        sortOrder: 'desc',
        page: 1,
        perPage: 1000,
      }, signal),
      {
        enabled: isEnabled && alertIds.length > 0,
        onError: (error: ServerError) => {
          showErrorToast(error, { title: ERROR_TITLE });
        },
      }
    )
  );

  const isLoading = queries.some((query) => query.isLoading);
  const isError = queries.some((query) => query.isError);

  // Create a map of case ID to attached alert IDs
  const caseToAttachedAlerts = new Map<string, string[]>();

  queries.forEach((query, index) => {
    if (query.data && cases[index]) {
      const caseId = cases[index].id;
      const attachedAlertIds: string[] = [];

      query.data.userActions.forEach((userAction) => {
        if (userAction.type === 'comment' && userAction.payload?.comment?.type === AttachmentType.alert) {
          const alertId = userAction.payload.comment.alertId;
          if (Array.isArray(alertId)) {
            attachedAlertIds.push(...alertId);
          } else if (alertId) {
            attachedAlertIds.push(alertId);
          }
        }
      });

      caseToAttachedAlerts.set(caseId, attachedAlertIds);
    }
  });

  // Check which cases have the current alert attached
  const casesWithAlertAttached = cases.filter((theCase) => {
    const attachedAlerts = caseToAttachedAlerts.get(theCase.id) || [];
    return alertIds.some((alertId) => attachedAlerts.includes(alertId));
  });

  return {
    isLoading,
    isError,
    caseToAttachedAlerts,
    casesWithAlertAttached,
    hasAlertAttached: (caseId: string) => {
      const attachedAlerts = caseToAttachedAlerts.get(caseId) || [];
      return alertIds.some((alertId) => attachedAlerts.includes(alertId));
    },
  };
};

export type UseCheckAlertAttachments = ReturnType<typeof useCheckAlertAttachments>;