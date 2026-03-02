/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFlexItem,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import React, { useMemo, useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { ALERT_URL } from '@kbn/rule-data-utils';
import { DefaultAlertActions } from '@kbn/response-ops-alerts-table/components/default_alert_actions';
import type { GetAlertsTableProp } from '@kbn/response-ops-alerts-table/types';
import { useCaseActions } from './use_case_actions';

const RULE_DETAILS_PAGE_ID = 'unified-rules-rule-details';

const VIEW_DETAILS = i18n.translate('xpack.unifiedRules.alertsTable.viewDetailsLabel', {
  defaultMessage: 'Alert details',
});

const VIEW_IN_APP = i18n.translate('xpack.unifiedRules.alertsTable.viewInAppLabel', {
  defaultMessage: 'View in app',
});

const MORE_ACTIONS = i18n.translate('xpack.unifiedRules.alertsTable.moreActionsLabel', {
  defaultMessage: 'More actions',
});

const NOT_ENOUGH_PERMISSIONS = i18n.translate(
  'xpack.unifiedRules.alertsTable.notEnoughPermissions',
  { defaultMessage: 'Additional privileges required' }
);

/**
 * Custom alert row actions for the unified rules plugin.
 * Provides: expand flyout, view in app, add to case (new/existing), plus default actions.
 */
export const UnifiedRulesAlertActions: GetAlertsTableProp<'renderActionsCell'> = (props) => {
  const { alert, rowIndex, onExpandedAlertIndexChange, refresh, services } = props;
  const {
    http: {
      basePath: { prepend },
    },
    cases,
  } = services;

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Resolve view-in-app URL from alert's kibana.alert.url field
  const viewInAppUrl = useMemo(() => {
    const alertUrl = alert[ALERT_URL];
    const rawUrl = Array.isArray(alertUrl)
      ? String(alertUrl[0])
      : typeof alertUrl === 'string'
      ? alertUrl
      : undefined;
    if (!rawUrl) return undefined;

    // If the URL is already absolute, use it as-is; otherwise prepend the basePath
    try {
      new URL(rawUrl);
      return rawUrl;
    } catch {
      return prepend(rawUrl);
    }
  }, [alert, prepend]);

  const userCasesPermissions = cases?.helpers.canUseCases(['cases']);

  const onAddToCase = useCallback(
    (_args: { isNewCase: boolean }) => {
      refresh?.();
    },
    [refresh]
  );

  const closeActionsPopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const { handleAddToExistingCaseClick, handleAddToNewCaseClick } = useCaseActions({
    onAddToCase,
    onClosePopover: closeActionsPopover,
    alerts: [alert],
    services: { cases },
  });

  const toggleActionsPopover = useCallback(() => {
    setIsPopoverOpen((open) => !open);
  }, []);

  const onExpandEvent = useCallback(() => {
    onExpandedAlertIndexChange?.(rowIndex);
  }, [onExpandedAlertIndexChange, rowIndex]);

  const { onExpandedAlertIndexChange: _onExpand, renderCellValue, ...defaultActionProps } = props;
  const actionsMenuItems = [
    ...(userCasesPermissions?.createComment && userCasesPermissions?.read
      ? [
          <EuiContextMenuItem
            data-test-subj="add-to-existing-case-action"
            key="addToExistingCase"
            onClick={handleAddToExistingCaseClick}
            size="s"
          >
            {i18n.translate('xpack.unifiedRules.alertActions.addToCase', {
              defaultMessage: 'Add to existing case',
            })}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            data-test-subj="add-to-new-case-action"
            key="addToNewCase"
            onClick={handleAddToNewCaseClick}
            size="s"
          >
            {i18n.translate('xpack.unifiedRules.alertActions.addToNewCase', {
              defaultMessage: 'Add to new case',
            })}
          </EuiContextMenuItem>,
        ]
      : []),
    <DefaultAlertActions
      key="defaultRowActions"
      onActionExecuted={closeActionsPopover}
      onExpandedAlertIndexChange={onExpandedAlertIndexChange}
      isAlertDetailsEnabled={true}
      resolveRulePagePath={(ruleId, currentPageId) =>
        currentPageId !== RULE_DETAILS_PAGE_ID && ruleId ? `/${ruleId}` : null
      }
      resolveAlertPagePath={undefined}
      {...defaultActionProps}
    />,
  ];

  const actionsToolTip = actionsMenuItems.length <= 1 ? NOT_ENOUGH_PERMISSIONS : MORE_ACTIONS;

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

      {viewInAppUrl && (
        <EuiFlexItem>
          <EuiToolTip content={VIEW_IN_APP} disableScreenReaderOutput>
            <EuiButtonIcon
              data-test-subj="unifiedRulesViewInAppButton"
              aria-label={VIEW_IN_APP}
              color="text"
              onClick={() => window.open(viewInAppUrl)}
              iconType="eye"
              size="s"
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}

      <EuiFlexItem css={{ textAlign: 'center' }}>
        <EuiPopover
          anchorPosition="downLeft"
          button={
            <EuiToolTip content={actionsToolTip} disableScreenReaderOutput>
              <EuiButtonIcon
                aria-label={actionsToolTip}
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
