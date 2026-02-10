/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem } from '@elastic/eui';
import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import {
  ALERT_RULE_UUID,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_UUID,
  ALERT_WORKFLOW_STATUS,
} from '@kbn/rule-data-utils';
import type { AdditionalContext, AlertActionsProps } from '../types';
import { ACKNOWLEDGE, UNACKNOWLEDGE } from '../translations';
import { typedMemo } from '../utils/react';
import { useAlertsTableContext } from '../contexts/alerts_table_context';

const BULK_UPDATE_PATH = '/internal/rac/alerts/bulk_update';
// TODO: Derive the correct alert index from the alert's rule type or _index field
// instead of using a wildcard pattern.
const ALERTS_INDEX_PATTERN = '.alerts-*';

/**
 * Alerts table row action to acknowledge (ACK) or unacknowledge (reopen) the selected alert.
 *
 * - "Acknowledge" is shown for active alerts whose workflow_status is 'open'.
 * - "Unacknowledge" is shown for alerts whose workflow_status is 'acknowledged'.
 */
export const AcknowledgeAlertAction = typedMemo(
  <AC extends AdditionalContext = AdditionalContext>({
    alert,
    refresh,
    onActionExecuted,
  }: AlertActionsProps<AC>) => {
    const {
      services: { http, notifications },
    } = useAlertsTableContext();

    const alertUuid = alert[ALERT_UUID]?.[0] as string | undefined;
    const ruleId = alert[ALERT_RULE_UUID]?.[0] as string | undefined;
    const alertStatus = alert[ALERT_STATUS]?.[0] as string | undefined;
    const workflowStatus = alert[ALERT_WORKFLOW_STATUS]?.[0] as string | undefined;

    const isActive = alertStatus === ALERT_STATUS_ACTIVE;
    const isOpen = workflowStatus === 'open' || workflowStatus == null;
    const isAcknowledged = workflowStatus === 'acknowledged';

    const canAcknowledge = isActive && isOpen;
    const canUnacknowledge = isAcknowledged;

    const handleClick = useCallback(async () => {
      if (!alertUuid) return;

      const newStatus = canAcknowledge ? 'acknowledged' : 'open';
      try {
        await http.post(BULK_UPDATE_PATH, {
          body: JSON.stringify({
            ids: [alertUuid],
            status: newStatus,
            index: ALERTS_INDEX_PATTERN,
          }),
        });
        notifications.toasts.addSuccess(
          newStatus === 'acknowledged'
            ? i18n.translate('xpack.responseOpsAlertsTable.actions.alertAcknowledged', {
                defaultMessage: 'Alert acknowledged',
              })
            : i18n.translate('xpack.responseOpsAlertsTable.actions.alertUnacknowledged', {
                defaultMessage: 'Alert unacknowledged',
              })
        );
      } catch (error) {
        notifications.toasts.addError(
          error.body?.message ? new Error(error.body.message) : error,
          {
            title: i18n.translate('xpack.responseOpsAlertsTable.actions.acknowledgeError', {
              defaultMessage: 'Error updating alert status',
            }),
          }
        );
      }
      onActionExecuted?.();
      refresh();
    }, [alertUuid, canAcknowledge, http, notifications, onActionExecuted, refresh]);

    // Only show when we can acknowledge or unacknowledge
    if ((!canAcknowledge && !canUnacknowledge) || !alertUuid || !ruleId) {
      return null;
    }

    return (
      <EuiContextMenuItem
        data-test-subj={canAcknowledge ? 'acknowledge-alert' : 'unacknowledge-alert'}
        onClick={handleClick}
        size="s"
      >
        {canAcknowledge ? ACKNOWLEDGE : UNACKNOWLEDGE}
      </EuiContextMenuItem>
    );
  }
);
