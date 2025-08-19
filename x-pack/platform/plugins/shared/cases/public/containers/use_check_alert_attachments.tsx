/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InternalFindCaseUserActions, UserActionUI, CaseUI } from './types';
import { type GetAttachments } from '../components/all_cases/selector_modal/use_cases_add_to_existing_case_modal';
import { useFindCasesUserActions } from './use_find_case_user_actions';

export interface UseCheckAlertAttachmentsProps {
  cases: Pick<CaseUI, 'id'>[];
  getAttachments?: GetAttachments;
}

function hasAlertId<T>(arg: T): arg is T & { alertId: string[] | string } {
  const candidate = arg as unknown;
  return (
    typeof candidate === 'object' &&
    candidate !== null &&
    'alertId' in candidate &&
    (Array.isArray(candidate.alertId) || typeof candidate.alertId === 'string')
  );
}

export const useCheckAlertAttachments = ({
  cases,
  getAttachments,
}: UseCheckAlertAttachmentsProps): { disabledCases: Set<string>; isLoading: boolean } => {
  const selectedAlerts = (getAttachments?.({ theCase: undefined }) ?? [])
    .filter(hasAlertId)
    .map(({ alertId }) => alertId)
    .flatMap((a) => a);

  const findActionsForCasesResult = useFindCasesUserActions(
    cases.map((caseInfo) => ({
      caseId: caseInfo.id,
      params: {
        // filter out non-alert actions
        type: 'alert',
        sortOrder: 'asc',
        page: 1,
        perPage: 100,
      },
      // if there are no alerts selected, disable the queries
      isEnabled: selectedAlerts.length > 0,
    }))
  );

  // if either of these are empty we don't need any further processing
  if (!selectedAlerts.length || !cases.length) {
    return {
      disabledCases: new Set(),
      isLoading: false,
    };
  }

  const caseAttachmentsMap = new Map<string, Set<string>>();
  findActionsForCasesResult.forEach((item) => {
    if (item.isSuccess === true) {
      const data = item.data as { caseId: string } & InternalFindCaseUserActions;
      caseAttachmentsMap.set(
        data.caseId,
        // a set will give us O(1) lookups for each alert in the worst case instead of O(n)
        new Set(
          data.userActions.flatMap((userAction: UserActionUI) =>
            userAction.type === 'comment' && userAction.payload.comment.type === 'alert'
              ? userAction.payload.comment.alertId
              : []
          )
        )
      );
    }
  });

  return {
    disabledCases: new Set(
      Array.from(caseAttachmentsMap.entries())
        .filter(([_id, caseAttachments]) => {
          if (
            !caseAttachments ||
            // If there are fewer attached alerts than selected alerts, it's impossible for all selected alerts to be attached; skip comparison
            caseAttachments.size < selectedAlerts.length
          ) {
            return false;
          }
          // we must walk the selected alerts for this case
          return selectedAlerts.every((alertId) => caseAttachments.has(alertId));
        })
        .map(([caseId]) => caseId)
    ),
    isLoading: findActionsForCasesResult.some((item) => item.isFetching),
  };
};

export type UseCheckAlertAttachments = ReturnType<typeof useCheckAlertAttachments>;
