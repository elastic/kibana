/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiIcon, EuiTextColor } from '@elastic/eui';
import type { EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import type { CasesUI } from '../../../containers/types';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { canMergeCases, getMergeDisabledReason } from '../../merge_cases/utils';
import { MERGE_CASES } from '../../merge_cases/translations';

interface UseMergeActionProps {
  /** Called when the menu item is clicked, before the flyout opens. Typically closes the popover. */
  onAction: () => void;
  /** Called after the merge settles. Typically refreshes the table. */
  onActionSuccess: () => void;
}

export interface UseMergeActionResult {
  /** Merging updates cases and copies attachments into one; a new case also needs create. */
  canMerge: boolean;
  getAction: (selectedCases: CasesUI) => EuiContextMenuPanelItemDescriptor;
  isFlyoutOpen: boolean;
  casesToMerge: CasesUI;
  onFlyoutClosed: () => void;
  onMerged: () => void;
}

export const useMergeAction = ({
  onAction,
  onActionSuccess,
}: UseMergeActionProps): UseMergeActionResult => {
  const { permissions } = useCasesContext();
  const [casesToMerge, setCasesToMerge] = useState<CasesUI | null>(null);
  const canMerge = canMergeCases(permissions);

  const getAction = useCallback(
    (selectedCases: CasesUI): EuiContextMenuPanelItemDescriptor => {
      const disabledReason = getMergeDisabledReason(selectedCases);

      return {
        name: <EuiTextColor>{MERGE_CASES}</EuiTextColor>,
        onClick: () => {
          onAction();
          setCasesToMerge(selectedCases);
        },
        disabled: disabledReason != null,
        toolTipContent: disabledReason,
        'data-test-subj': 'cases-bulk-action-merge',
        icon: <EuiIcon type="merge" size="m" aria-hidden={true} />,
        key: 'cases-bulk-action-merge',
      };
    },
    [onAction]
  );

  const onFlyoutClosed = useCallback(() => setCasesToMerge(null), []);

  const onMerged = useCallback(() => {
    setCasesToMerge(null);
    onActionSuccess();
  }, [onActionSuccess]);

  return {
    canMerge,
    getAction,
    isFlyoutOpen: casesToMerge != null,
    casesToMerge: casesToMerge ?? [],
    onFlyoutClosed,
    onMerged,
  };
};
