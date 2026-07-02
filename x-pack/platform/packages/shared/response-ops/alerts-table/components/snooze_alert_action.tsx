/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import { ALERT_STATUS, ALERT_STATUS_ACTIVE } from '@kbn/rule-data-utils';
import { AlertSnoozePopover, AlertSnoozePanelInline } from '@kbn/response-ops-alert-snooze';
import type { AlertSnoozePayload } from '@kbn/response-ops-alert-snooze';
import { useMuteAlertInstance } from '@kbn/response-ops-alerts-apis/hooks/use_mute_alert_instance';
import { useUnmuteAlertInstance } from '@kbn/response-ops-alerts-apis/hooks/use_unmute_alert_instance';
import { useSnoozeAlertInstance } from '@kbn/response-ops-alerts-apis/hooks/use_snooze_alert_instance';
import { useUnsnoozeAlertInstance } from '@kbn/response-ops-alerts-apis/hooks/use_unsnooze_alert_instance';
import type { SnoozeCondition } from '@kbn/response-ops-alerts-apis/types';
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

    const { mutateAsync: muteAlert } = useMuteAlertInstance({ http, notifications });
    const { mutateAsync: unmuteAlert } = useUnmuteAlertInstance({ http, notifications });
    const { mutateAsync: snoozeAlert } = useSnoozeAlertInstance({ http, notifications });
    const { mutateAsync: unsnoozeAlert } = useUnsnoozeAlertInstance({ http, notifications });

    const isAlertActive = alert[ALERT_STATUS]?.[0] === ALERT_STATUS_ACTIVE;

    const handleActionDone = useCallback(() => {
      onActionExecuted?.();
      refresh();
    }, [onActionExecuted, refresh]);

    const handleUnsnooze = useCallback(async () => {
      if (ruleId == null || alertInstanceId == null) return;
      if (isMuted) {
        await unmuteAlert({ ruleId, alertInstanceId });
      }
      if (isSnoozed && snoozedInstance) {
        await unsnoozeAlert({ ruleId, alertInstanceId });
      }
      handleActionDone();
    }, [
      alertInstanceId,
      handleActionDone,
      isMuted,
      isSnoozed,
      snoozedInstance,
      ruleId,
      unmuteAlert,
      unsnoozeAlert,
    ]);

    const handleSnoozeApply = useCallback(
      async (payload: AlertSnoozePayload) => {
        if (ruleId == null || alertInstanceId == null) return;

        if (payload.expiresAt === null && !payload.conditions?.length) {
          // Indefinitely with no conditions → mute
          await muteAlert({ ruleId, alertInstanceId });
        } else {
          await snoozeAlert({
            ruleId,
            alertInstanceId,
            ...(payload.expiresAt !== undefined && { expiresAt: payload.expiresAt ?? undefined }),
            ...(payload.conditions?.length && {
              conditions: payload.conditions as SnoozeCondition[],
              conditionOperator: payload.conditionOperator,
            }),
          });
        }
        closePanel?.();
        handleActionDone();
      },
      [alertInstanceId, closePanel, handleActionDone, muteAlert, ruleId, snoozeAlert]
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
