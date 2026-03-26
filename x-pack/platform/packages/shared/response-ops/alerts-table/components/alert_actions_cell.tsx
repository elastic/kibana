/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiFlexItem,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';

import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useGetRuleTypesPermissions } from '@kbn/alerts-ui-shared/src/common/hooks';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';
import { ALERT_RULE_TYPE_ID, isSiemRuleType } from '@kbn/rule-data-utils';
import { ViewRuleDetailsAlertAction } from './view_rule_details_alert_action';
import { ViewAlertDetailsAlertAction } from './view_alert_details_alert_action';
import { AcknowledgeAlertAction } from './acknowledge_alert_action';
import { MarkAsUntrackedAlertAction } from './mark_as_untracked_alert_action';
import { MuteAlertAction } from './mute_alert_action';
import { EditTagsAction } from './edit_tags_action';
import { SnoozeNotificationsPopoverPanel } from './snooze_notifications_popover_panel';
import type { AdditionalContext, GetAlertsTableProp } from '../types';
import { STACK_MANAGEMENT_RULE_PAGE_URL_PREFIX } from '../constants';
import { useAlertsTableContext } from '../contexts/alerts_table_context';

const actionsToolTip = i18n.translate('xpack.triggersActionsUI.alertsTable.moreActionsTextLabel', {
  defaultMessage: 'More actions',
});

const snoozeLabel = i18n.translate('xpack.responseOpsAlertsTable.actions.snooze', {
  defaultMessage: 'Snooze',
});

/**
 * Cell containing contextual actions for a single alert row in the table.
 * Uses EuiContextMenu with two panels: panel 0 (grouped with horizontal rules:
 * view rule/details, then modify actions including snooze submenu) and panel 1
 * (snooze panel), following the same pattern as the Rules list collapsed item actions.
 */
export const AlertActionsCell: GetAlertsTableProp<'renderActionsCell'> = (props) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const {
    services: {
      http,
      notifications: { toasts },
    },
  } = useAlertsTableContext();

  const { authorizedToCreateAnyRules } = useGetRuleTypesPermissions({
    filteredRuleTypes: [],
    http,
    toasts,
    context: AlertsQueryContext,
  });

  const isSecurityRule =
    props.alert[ALERT_RULE_TYPE_ID] &&
    isSiemRuleType(props.alert[ALERT_RULE_TYPE_ID].toString());

  const showModifyOption = authorizedToCreateAnyRules && !isSecurityRule;
  const { isMutedAlertsEnabled = true } = props;

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const toggleActionsPopover = useCallback(() => {
    setIsPopoverOpen((open) => !open);
  }, []);

  const actionProps = useMemo(
    () => ({
      ...props,
      onActionExecuted: closePopover,
      resolveRulePagePath: (alertRuleId: string) =>
        alertRuleId ? `${STACK_MANAGEMENT_RULE_PAGE_URL_PREFIX}${alertRuleId}` : null,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props, closePopover]
  );

  const panels: EuiContextMenuPanelDescriptor[] = useMemo(
    () => [
      {
        id: 0,
        size: 's',
        items: [
          {
            key: 'viewRuleDetails',
            renderItem: () => <ViewRuleDetailsAlertAction<AdditionalContext> {...actionProps} />,
          },
          {
            key: 'viewAlertDetails',
            renderItem: () => <ViewAlertDetailsAlertAction<AdditionalContext> {...actionProps} />,
          },
          ...(showModifyOption
            ? [
                { isSeparator: true as const, key: 'sep-views-actions' },
                {
                  key: 'snooze',
                  name: snoozeLabel,
                  'data-test-subj': 'snooze-alert',
                  panel: 1,
                },
                {
                  key: 'acknowledge',
                  renderItem: () => (
                    <AcknowledgeAlertAction<AdditionalContext> {...actionProps} />
                  ),
                },
                {
                  key: 'markUntracked',
                  renderItem: () => (
                    <MarkAsUntrackedAlertAction<AdditionalContext> {...actionProps} />
                  ),
                },
                ...(isMutedAlertsEnabled
                  ? [
                      {
                        key: 'mute',
                        renderItem: () => <MuteAlertAction<AdditionalContext> {...actionProps} />,
                      },
                    ]
                  : []),
                {
                  key: 'editTags',
                  renderItem: () => <EditTagsAction<AdditionalContext> {...actionProps} />,
                },
              ]
            : []),
        ],
      },
      {
        id: 1,
        title: snoozeLabel,
        width: 400,
        content: (
          <SnoozeNotificationsPopoverPanel onClose={closePopover} onSnooze={closePopover} />
        ),
      },
    ],
    [actionProps, showModifyOption, isMutedAlertsEnabled, closePopover]
  );

  return (
    <EuiFlexItem>
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
        closePopover={closePopover}
        isOpen={isPopoverOpen}
        panelPaddingSize="s"
      >
        <EuiContextMenu
          initialPanelId={0}
          panels={panels}
          data-test-subj="alertsTableActionsMenu"
        />
      </EuiPopover>
    </EuiFlexItem>
  );
};
