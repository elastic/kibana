/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import type { CasesUI } from '../../../../common';
import { CaseStatuses } from '../../../../common/types/domain';

import { useUserPermissions } from '../../user_actions/use_user_permissions';

export const useShouldDisableStatus = () => {
  const { canUpdate, canReopenCase } = useUserPermissions();

  const shouldDisableStatusFn = useCallback(
    (selectedCases: Array<Pick<CasesUI[number], 'status'>>) => {
      // Read Only + Disabled => Cannot do anything
      const missingAllUpdatePermissions = !canUpdate && !canReopenCase;
      if (missingAllUpdatePermissions) return true;

      // All + Enabled reopen => can change status at any point in any way
      if (canUpdate && canReopenCase) return false;

      const selectedCasesContainsClosed = selectedCases.some(
        (theCase) => theCase.status === CaseStatuses.closed
      );

      if (selectedCasesContainsClosed) {
        return !canReopenCase;
      } else {
        return !canUpdate;
      }
    },
    [canReopenCase, canUpdate]
  );

  return shouldDisableStatusFn;
};
