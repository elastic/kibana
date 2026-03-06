/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import type { Alert } from '@kbn/alerting-types';
import type { CasesService } from '../types';
import { useCaseActions } from './use_case_actions';
import { ADD_TO_EXISTING_CASE, ADD_TO_NEW_CASE } from '../translations';

/**
 * Returns "Add to existing case" and "Add to new case" context menu items
 * for the alerts table actions popover.
 *
 * Returns an empty array if the cases service is unavailable or the user lacks permissions.
 */
export const useCaseAlertActionItems = ({
  alert,
  cases,
  refresh,
  onActionExecuted,
}: {
  alert: Alert;
  cases?: CasesService;
  refresh: () => void;
  onActionExecuted?: () => void;
}): React.ReactElement[] => {
  const userCasesPermissions = cases?.helpers.canUseCases(['cases']);

  const { handleAddToExistingCaseClick, handleAddToNewCaseClick } = useCaseActions({
    alerts: [alert],
    cases,
    onAddToCase: refresh,
  });

  return useMemo(() => {
    if (!userCasesPermissions?.createComment || !userCasesPermissions?.read) {
      return [];
    }

    return [
      <EuiContextMenuItem
        data-test-subj="add-to-existing-case-action"
        key="addToExistingCase"
        onClick={() => {
          handleAddToExistingCaseClick();
          onActionExecuted?.();
        }}
        size="s"
      >
        {ADD_TO_EXISTING_CASE}
      </EuiContextMenuItem>,
      <EuiContextMenuItem
        data-test-subj="add-to-new-case-action"
        key="addToNewCase"
        onClick={() => {
          handleAddToNewCaseClick();
          onActionExecuted?.();
        }}
        size="s"
      >
        {ADD_TO_NEW_CASE}
      </EuiContextMenuItem>,
    ];
  }, [
    userCasesPermissions?.createComment,
    userCasesPermissions?.read,
    handleAddToExistingCaseClick,
    handleAddToNewCaseClick,
    onActionExecuted,
  ]);
};
