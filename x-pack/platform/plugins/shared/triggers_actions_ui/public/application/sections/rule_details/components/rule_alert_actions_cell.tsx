/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFlexItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { DefaultAlertActions } from '@kbn/response-ops-alerts-table/components/default_alert_actions';
import type { GetAlertsTableProp } from '@kbn/response-ops-alerts-table/types';
import { STACK_MANAGEMENT_RULE_PAGE_URL_PREFIX } from '@kbn/response-ops-alerts-table/constants';

const VIEW_DETAILS = i18n.translate(
  'xpack.triggersActionsUI.ruleDetails.alertsTable.viewDetailsLabel',
  { defaultMessage: 'Alert details' }
);

const MORE_ACTIONS = i18n.translate(
  'xpack.triggersActionsUI.ruleDetails.alertsTable.moreActionsLabel',
  { defaultMessage: 'More actions' }
);

/**
 * Actions cell for the rule details alerts table.
 * Contains three buttons: expand row, view in app, and a kebab menu with common actions.
 */
export const RuleAlertActionsCell: GetAlertsTableProp<'renderActionsCell'> = (props) => {
  const { rowIndex } = props;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const closeActionsPopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const toggleActionsPopover = useCallback(() => {
    setIsPopoverOpen((open) => !open);
  }, []);

  const onExpandEvent = useCallback(() => {
    props.onExpandedAlertIndexChange?.(rowIndex);
  }, [props, rowIndex]);

  const { onExpandedAlertIndexChange, renderCellValue, ...defaultActionProps } = props;

  const actionsMenuItems = [
    <DefaultAlertActions
      key="defaultRowActions"
      onActionExecuted={closeActionsPopover}
      onExpandedAlertIndexChange={onExpandedAlertIndexChange}
      isAlertDetailsEnabled={false}
      resolveRulePagePath={(alertRuleId) =>
        alertRuleId ? `${STACK_MANAGEMENT_RULE_PAGE_URL_PREFIX}${alertRuleId}` : null
      }
      {...defaultActionProps}
    />,
  ];

  return (
    <>
      <EuiFlexItem>
        <EuiToolTip content={VIEW_DETAILS} disableScreenReaderOutput>
          <EuiButtonIcon
            data-test-subj="expand-event"
            iconType="expand"
            onClick={onExpandEvent}
            size="s"
            color="text"
            aria-label={VIEW_DETAILS}
          />
        </EuiToolTip>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiPopover
          anchorPosition="downLeft"
          button={
            <EuiToolTip content={MORE_ACTIONS} disableScreenReaderOutput>
              <EuiButtonIcon
                aria-label={MORE_ACTIONS}
                color="text"
                data-test-subj="alertsTableRowActionMore"
                display="empty"
                iconType="boxesHorizontal"
                onClick={toggleActionsPopover}
                size="s"
              />
            </EuiToolTip>
          }
          closePopover={closeActionsPopover}
          isOpen={isPopoverOpen}
          panelPaddingSize="none"
        >
          <EuiContextMenuPanel
            size="s"
            items={actionsMenuItems}
            data-test-subj="alertsTableActionsMenu"
          />
        </EuiPopover>
      </EuiFlexItem>
    </>
  );
};
