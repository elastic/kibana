/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
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
import { useBulkUpdateWorkflowStatus } from '../hooks/use_bulk_update_workflow_status';

const FALLBACK_ALERTS_INDEX = '.alerts-*';

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
    const { mutateAsync: updateWorkflowStatus } = useBulkUpdateWorkflowStatus({
      http,
      notifications,
    });

    const alertId = (alert._id ?? alert[ALERT_UUID]?.[0]) as string | undefined;
    const alertIndex = (alert._index as string) ?? FALLBACK_ALERTS_INDEX;
    const ruleId = alert[ALERT_RULE_UUID]?.[0] as string | undefined;
    const alertStatus = alert[ALERT_STATUS]?.[0] as string | undefined;
    const workflowStatus = alert[ALERT_WORKFLOW_STATUS]?.[0] as string | undefined;

    const isActive = alertStatus === ALERT_STATUS_ACTIVE;
    const isOpen = workflowStatus === 'open' || workflowStatus == null;
    const isAcknowledged = workflowStatus === 'acknowledged';

    const canAcknowledge = useMemo(() => isActive && isOpen, [isActive, isOpen]);
    const canUnacknowledge = isAcknowledged;

    const handleClick = useCallback(async () => {
      if (!alertId) return;

      const newStatus = canAcknowledge ? 'acknowledged' : 'open';
      await updateWorkflowStatus({ ids: [alertId], status: newStatus, index: alertIndex });
      onActionExecuted?.();
      refresh();
    }, [alertId, alertIndex, canAcknowledge, updateWorkflowStatus, onActionExecuted, refresh]);

    if ((!canAcknowledge && !canUnacknowledge) || !alertId || !ruleId) {
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
