/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import type { AlertsTableProps } from '@kbn/response-ops-alerts-table/types';
import { MORE_ACTIONS, REMOVE_FROM_CASE } from '../translations';

export const STACK_ALERT_ROW_ACTIONS_TEST_ID = 'stack-alert-row-actions';
export const REMOVE_STACK_ALERT_FROM_CASE_TEST_ID = 'remove-stack-alert-from-case';

export interface StackAlertsTableContext {
  onRemoveFromCase?: (alertId: string) => void;
}

type StackAlertActionsCellProps = React.ComponentProps<
  NonNullable<AlertsTableProps<StackAlertsTableContext>['renderActionsCell']>
>;

export const StackAlertActionsCell = ({ alert, onRemoveFromCase }: StackAlertActionsCellProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const closePopover = useCallback(() => setIsPopoverOpen(false), []);
  const togglePopover = useCallback(() => setIsPopoverOpen((open) => !open), []);

  if (!onRemoveFromCase) {
    return null;
  }

  return (
    <EuiPopover
      aria-label={MORE_ACTIONS}
      anchorPosition="rightCenter"
      button={
        <EuiToolTip content={MORE_ACTIONS} disableScreenReaderOutput>
          <EuiButtonIcon
            aria-label={MORE_ACTIONS}
            color="text"
            data-test-subj={STACK_ALERT_ROW_ACTIONS_TEST_ID}
            display="empty"
            iconType="ellipsis"
            onClick={togglePopover}
            size="s"
          />
        </EuiToolTip>
      }
      closePopover={closePopover}
      isOpen={isPopoverOpen}
      panelPaddingSize="none"
    >
      <EuiContextMenuPanel
        items={[
          <EuiContextMenuItem
            key={REMOVE_STACK_ALERT_FROM_CASE_TEST_ID}
            data-test-subj={REMOVE_STACK_ALERT_FROM_CASE_TEST_ID}
            icon="trash"
            onClick={() => {
              closePopover();
              onRemoveFromCase(alert._id);
            }}
          >
            {REMOVE_FROM_CASE}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};

StackAlertActionsCell.displayName = 'StackAlertActionsCell';
