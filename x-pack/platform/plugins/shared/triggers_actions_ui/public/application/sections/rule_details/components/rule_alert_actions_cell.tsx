/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexItem, EuiPopover, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useState, type ReactElement } from 'react';
import { i18n } from '@kbn/i18n';
import { DefaultAlertActions } from '@kbn/response-ops-alerts-table/components/default_alert_actions';
import type { GetAlertsTableProp } from '@kbn/response-ops-alerts-table/types';
import { STACK_MANAGEMENT_RULE_PAGE_URL_PREFIX } from '@kbn/response-ops-alerts-table/constants';
import { useViewInAppUrl } from '@kbn/response-ops-alerts-table/hooks/use_view_in_app_url';
import { useCaseAlertActionItems } from '@kbn/response-ops-alerts-table/hooks/use_case_alert_action_items';
import { ExpandableContextMenuPanel } from '@kbn/response-ops-alerts-table/components/expandable_context_menu_panel';
import { useGetRuleTypesPermissions } from '@kbn/alerts-ui-shared/src/common/hooks';
import { useCanModifyAlerts } from '../../alerts_page/hooks/use_can_modify_alerts';
import { useKibana } from '../../../../common/lib/kibana';

const VIEW_DETAILS = i18n.translate(
  'xpack.triggersActionsUI.ruleDetails.alertsTable.viewDetailsLabel',
  { defaultMessage: 'Alert details' }
);

const MORE_ACTIONS = i18n.translate(
  'xpack.triggersActionsUI.ruleDetails.alertsTable.moreActionsLabel',
  { defaultMessage: 'More actions' }
);

const VIEW_IN_APP = i18n.translate(
  'xpack.triggersActionsUI.ruleDetails.alertsTable.viewInAppLabel',
  { defaultMessage: 'View in app' }
);

/**
 * Actions cell for the rule details alerts table.
 * Contains up to three buttons: expand row, view in app (when available), and a kebab menu with common actions.
 */
export const RuleAlertActionsCell: GetAlertsTableProp<'renderActionsCell'> = (props) => {
  const { rowIndex, alert, getAlertFormatter, openLinksInNewTab, alertDetailsNavigation } = props;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const viewInAppUrl = useViewInAppUrl(alert, getAlertFormatter);
  const canModifyAlerts = useCanModifyAlerts();

  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const { authorizedToReadRuleForAlert } = useGetRuleTypesPermissions({
    http,
    toasts,
    filteredRuleTypes: [],
  });
  const canReadAlertRule = authorizedToReadRuleForAlert(alert);

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

  const caseActionItems = useCaseAlertActionItems({
    alert: props.alert,
    cases: props.services.cases,
    refresh: props.refresh,
    onActionExecuted: closeActionsPopover,
  });

  const actionsMenuItems: ReactElement[] = [
    ...caseActionItems,
    <DefaultAlertActions
      key="defaultRowActions"
      onActionExecuted={closeActionsPopover}
      onExpandedAlertIndexChange={onExpandedAlertIndexChange}
      alertDetailsNavigation={alertDetailsNavigation}
      resolveRulePagePath={(alertRuleId) =>
        canReadAlertRule && alertRuleId
          ? `${STACK_MANAGEMENT_RULE_PAGE_URL_PREFIX}${alertRuleId}`
          : null
      }
      {...defaultActionProps}
      canModifyAlerts={canModifyAlerts}
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

      {viewInAppUrl && (
        <EuiFlexItem>
          <EuiToolTip content={VIEW_IN_APP} disableScreenReaderOutput>
            <EuiButtonIcon
              data-test-subj="viewInAppAlertAction"
              aria-label={VIEW_IN_APP}
              color="text"
              iconType="eye"
              onClick={() => window.open(viewInAppUrl, openLinksInNewTab ? '_blank' : '_self')}
              size="s"
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}

      <EuiFlexItem>
        <EuiPopover
          anchorPosition="rightCenter"
          aria-label={MORE_ACTIONS}
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
          panelStyle={{ maxHeight: '80vh', overflowY: 'auto' }}
        >
          <ExpandableContextMenuPanel items={actionsMenuItems} />
        </EuiPopover>
      </EuiFlexItem>
    </>
  );
};
