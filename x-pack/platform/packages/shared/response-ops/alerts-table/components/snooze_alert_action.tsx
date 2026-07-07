/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiContextMenuItem } from '@elastic/eui';
import { ALERT_RULE_TYPE_ID, ALERT_STATUS, ALERT_STATUS_ACTIVE } from '@kbn/rule-data-utils';
import {
  AlertSnoozePanelInline,
  useAlertSnooze,
  useDataConditionTypes,
} from '@kbn/response-ops-alert-snooze';
import type {
  AlertSnoozePayload,
  UseDataConditionTypesParams,
} from '@kbn/response-ops-alert-snooze';
import type { AdditionalContext, AlertActionsProps } from '../types';
import { UNSNOOZE, SNOOZE } from '../translations';
import { useAlertMutedState } from '../hooks/use_alert_muted_state';
import { useAlertSnoozedState } from '../hooks/use_alert_snoozed_state';
import { typedMemo } from '../utils/react';
import { useAlertsTableContext } from '../contexts/alerts_table_context';
import { useExpandableContextMenuPanel } from '../contexts/expandable_context_menu_panel_context';

/**
 * Snooze form rendered inline inside the actions popover. The alert-field
 * options are fetched here (not by the parent) so that when the panel is opened
 * via `openPanel` — which snapshots its content — the dropdown still reflects
 * fields as they finish loading.
 */
const SnoozeInlineForm = ({
  http,
  ruleTypeIds,
  onApply,
  onBack,
}: UseDataConditionTypesParams & {
  onApply: (payload: AlertSnoozePayload) => void;
  onBack: () => void;
}) => {
  const dataConditionTypes = useDataConditionTypes({ http, ruleTypeIds });
  return (
    <AlertSnoozePanelInline
      onApply={onApply}
      onBack={onBack}
      dataConditionTypes={dataConditionTypes}
    />
  );
};

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
    const ruleTypeId = alert[ALERT_RULE_TYPE_ID]?.[0];
    const ruleTypeIds = typeof ruleTypeId === 'string' ? [ruleTypeId] : [];

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

    // SnoozeAlertAction is always rendered inside the alerts table's expandable
    // actions menu, which provides openPanel to swap the menu out for the inline
    // snooze form (a back button inside the form restores the menu).
    if (!openPanel) {
      return null;
    }

    const handleOpenInline = () => {
      openPanel(
        <SnoozeInlineForm
          http={http}
          ruleTypeIds={ruleTypeIds}
          onApply={handleSnoozeApply}
          onBack={() => closePanel?.()}
        />
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
);
