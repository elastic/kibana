/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import { ALERT_STATUS, ALERT_STATUS_ACTIVE } from '@kbn/rule-data-utils';
import {
  AlertSnoozePopover,
  AlertSnoozePanelInline,
  useAlertSnooze,
} from '@kbn/response-ops-alert-snooze';
import type { AlertSnoozePayload } from '@kbn/response-ops-alert-snooze';
import type { AdditionalContext, AlertActionsProps } from '../types';
import { UNSNOOZE, SNOOZE } from '../translations';
import { useAlertMutedState } from '../hooks/use_alert_muted_state';
import { useAlertSnoozedState } from '../hooks/use_alert_snoozed_state';
import { typedMemo } from '../utils/react';
import { useAlertsTableContext } from '../contexts/alerts_table_context';
import { useExpandableContextMenuPanel } from '../contexts/expandable_context_menu_panel_context';

/**
 * Alerts table row action for snoozing/unsnoozeing alerts.
 */
export const SnoozeAlertAction = typedMemo(
  <AC extends AdditionalContext = AdditionalContext>({
    alert,
    refresh,
    onActionExecuted,
  }: AlertActionsProps<AC>) => {
    const expandablePanelContext = useExpandableContextMenuPanel();
    const { openPanel, closePanel } = expandablePanelContext ?? {};
    const {
      services: { http, notifications },
    } = useAlertsTableContext();

    const { isMuted, ruleId, alertInstanceId } = useAlertMutedState(alert);
    const { isSnoozed, snoozedInstance } = useAlertSnoozedState(alert);

    const isAlertActive = alert[ALERT_STATUS]?.[0] === ALERT_STATUS_ACTIVE;

    const handleActionDone = useCallback(() => {
      onActionExecuted?.();
      refresh();
    }, [onActionExecuted, refresh]);

    const { snoozeAlert, unsnoozeAlert } = useAlertSnooze({
      http,
      notifications,
      ruleId,
      instanceId: alertInstanceId,
      isMuted: isMuted ?? undefined,
      isSnoozed,
      onSuccess: handleActionDone,
    });

    const handleUnsnooze = useCallback(async () => {
      await unsnoozeAlert();
    }, [unsnoozeAlert]);

    const handleSnoozeApply = useCallback(
      async (payload: AlertSnoozePayload) => {
        const applied = await snoozeAlert(payload);
        if (applied) {
          closePanel?.();
        }
      },
      [closePanel, snoozeAlert]
    );

    if ((!isAlertActive && !isMuted && !isSnoozed) || ruleId == null || alertInstanceId == null) {
      return null;
    }

    if (isMuted || (isSnoozed && snoozedInstance)) {
      return (
        <EuiContextMenuItem data-test-subj="snooze-alert-action-unsnooze" onClick={handleUnsnooze}>
          {UNSNOOZE}
        </EuiContextMenuItem>
      );
    }

    // When the expandable panel context is available, replace the actions menu
    // with the inline snooze form (a back button inside the form restores the menu).
    if (openPanel) {
      const handleOpenInline = () => {
        openPanel(
          <AlertSnoozePanelInline onApply={handleSnoozeApply} onBack={() => closePanel?.()} />
        );
      };
      return (
        <EuiContextMenuItem
          data-test-subj="snooze-alert-action-snooze"
          icon="arrowRight"
          onClick={handleOpenInline}
        >
          {SNOOZE}
        </EuiContextMenuItem>
      );
    }

    return <AlertSnoozePopover onApply={handleSnoozeApply} />;
  }
);
