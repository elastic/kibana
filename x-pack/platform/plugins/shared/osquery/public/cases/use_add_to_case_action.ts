/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useContext, useMemo } from 'react';
import {
  buildAlertCaseAttachment,
  OSQUERY_ATTACHMENT_TYPE,
  SECURITY_SOLUTION_OWNER,
} from '@kbn/cases-plugin/common';
import type { JsonValue } from '@kbn/utility-types';
import { useKibana } from '../common/lib/kibana';
import { AlertAttachmentContext } from '../common/contexts';

export interface UseAddToCaseActionArgs {
  queryId?: string;
  agentIds?: string[];
  actionId: string;
  scheduleId?: string;
  executionCount?: number;
}

export interface UseAddToCaseActionResult {
  hasCasesPermissions: boolean;
  handleClick: () => void;
}

/** Whether the current user can attach Osquery results to a case. */
export const useHasCasesPermissions = (): boolean => {
  const { cases } = useKibana().services;
  const casePermissions = cases.helpers.canUseCases();

  return casePermissions.read && casePermissions.update && casePermissions.push;
};

/**
 * Opens the "Add to existing case" modal for a single live-query action or scheduled execution,
 * reused by `AddToCaseButton` (rendered variants) and the results page's "Add to Case" menu item.
 * Must be rendered under `AddToCaseContextProvider` (or an existing `CasesContext`), same as
 * `AddToCaseButton` today.
 */
export const useAddToCaseAction = ({
  actionId,
  agentIds = [],
  queryId = '',
  scheduleId,
  executionCount,
}: UseAddToCaseActionArgs): UseAddToCaseActionResult => {
  const { cases } = useKibana().services;
  const ecsData = useContext(AlertAttachmentContext);
  const rule = useMemo(
    () => (ecsData ? cases.helpers.getRuleIdFromEvent({ ecs: ecsData, data: [] }) : null),
    [cases.helpers, ecsData]
  );

  const hasCasesPermissions = useHasCasesPermissions();
  const selectCaseModal = cases.hooks.useCasesAddToExistingCaseModal();

  const handleClick = useCallback(() => {
    const metadata: Record<string, JsonValue> = { actionId, agentIds, queryId };
    if (scheduleId) {
      metadata.scheduleId = scheduleId;
    }

    if (executionCount != null) {
      metadata.executionCount = executionCount;
    }

    if (hasCasesPermissions) {
      selectCaseModal.open({
        getAttachments: ({ theCase }) => {
          const alertAttachment = ecsData?._id
            ? [
                buildAlertCaseAttachment(theCase?.owner ?? SECURITY_SOLUTION_OWNER, {
                  alertId: ecsData._id,
                  index: ecsData._index ?? '',
                  rule,
                }),
              ]
            : [];

          return [
            ...alertAttachment,
            {
              type: OSQUERY_ATTACHMENT_TYPE,
              attachmentId: actionId,
              metadata,
            },
          ];
        },
      });
    }
  }, [
    actionId,
    agentIds,
    ecsData,
    executionCount,
    hasCasesPermissions,
    queryId,
    rule,
    scheduleId,
    selectCaseModal,
  ]);

  return { hasCasesPermissions, handleClick };
};
