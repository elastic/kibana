/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { Alert } from '@kbn/alerting-types';
import type { CasesOwner, CasesService } from '../types';
import { useCaseActions } from './use_case_actions';
import { ADD_TO_EXISTING_CASE, ADD_TO_NEW_CASE } from '../translations';
import { AddToCaseContextMenuItem } from '../components/add_to_case_context_menu_item';

/**
 * Returns an "Add to case" context menu item with new and existing case options.
 *
 * Returns an empty array if the cases service is unavailable or the user lacks permissions.
 */
export const useCaseAlertActionItems = ({
  alert,
  cases,
  refresh,
  onAddToCase,
  onActionExecuted,
  owner = ['cases'],
}: {
  alert: Alert;
  cases?: CasesService;
  refresh: () => void;
  onAddToCase?: (opts: { isNewCase: boolean }) => void;
  onActionExecuted?: () => void;
  owner?: CasesOwner[];
}): React.ReactElement[] => {
  const userCasesPermissions = cases?.helpers.canUseCases(owner);

  const { handleAddToExistingCaseClick, handleAddToNewCaseClick } = useCaseActions({
    alerts: [alert],
    cases,
    onAddToCase: onAddToCase ?? refresh,
  });

  return useMemo(() => {
    if (!userCasesPermissions?.createComment || !userCasesPermissions?.read) {
      return [];
    }

    return [
      <AddToCaseContextMenuItem
        key="addToCase"
        actions={[
          {
            id: 'addToNewCase',
            label: ADD_TO_NEW_CASE,
            dataTestSubj: 'add-to-new-case-action',
            onClick: () => {
              handleAddToNewCaseClick();
              onActionExecuted?.();
            },
          },
          {
            id: 'addToExistingCase',
            label: ADD_TO_EXISTING_CASE,
            dataTestSubj: 'add-to-existing-case-action',
            onClick: () => {
              handleAddToExistingCaseClick();
              onActionExecuted?.();
            },
          },
        ]}
      />,
    ];
  }, [
    userCasesPermissions?.createComment,
    userCasesPermissions?.read,
    handleAddToExistingCaseClick,
    handleAddToNewCaseClick,
    onActionExecuted,
  ]);
};
