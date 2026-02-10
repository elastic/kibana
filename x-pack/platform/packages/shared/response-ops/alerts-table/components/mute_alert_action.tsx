/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { ALERT_STATUS, ALERT_STATUS_ACTIVE } from '@kbn/rule-data-utils';

const ALERT_SEVERITY_FIELD = 'kibana.alert.severity';
import type { MuteCondition } from '@kbn/alerting-types';
import { useMuteAlertInstance } from '@kbn/response-ops-alerts-apis/hooks/use_mute_alert_instance';
import { useUnmuteAlertInstance } from '@kbn/response-ops-alerts-apis/hooks/use_unmute_alert_instance';
import type { AdditionalContext, AlertActionsProps } from '../types';
import { UNMUTE } from '../translations';
import { useAlertMutedState } from '../hooks/use_alert_muted_state';
import { typedMemo } from '../utils/react';
import { useAlertsTableContext } from '../contexts/alerts_table_context';
import { AlertSnoozePopover } from './alert_snooze_popover';

/**
 * Alerts table row action to mute/unmute/snooze the selected alert.
 *
 * When the alert is not muted, shows a "Snooze..." option that opens the snooze popover.
 * When the alert is already muted, shows "Unmute" to immediately lift the mute.
 */
export const MuteAlertAction = typedMemo(
  <AC extends AdditionalContext = AdditionalContext>({
    alert,
    refresh,
    onActionExecuted,
  }: AlertActionsProps<AC>) => {
    const {
      services: { http, notifications },
    } = useAlertsTableContext();
    const { isMuted, ruleId, rule, alertInstanceId } = useAlertMutedState(alert);
    const { mutateAsync: muteAlert } = useMuteAlertInstance({ http, notifications });
    const { mutateAsync: unmuteAlert } = useUnmuteAlertInstance({ http, notifications });
    const isAlertActive = useMemo(() => alert[ALERT_STATUS]?.[0] === ALERT_STATUS_ACTIVE, [alert]);
    const currentSeverity = alert[ALERT_SEVERITY_FIELD]?.[0] as string | undefined;

    const [isSnoozePopoverOpen, setIsSnoozePopoverOpen] = useState(false);

    const handleUnmute = useCallback(async () => {
      if (ruleId == null || alertInstanceId == null) return;
      await unmuteAlert({ ruleId, alertInstanceId });
      onActionExecuted?.();
      refresh();
    }, [alertInstanceId, onActionExecuted, refresh, ruleId, unmuteAlert]);

    const handleApplySnooze = useCallback(
      async (params: {
        expiresAt?: string;
        conditions?: MuteCondition[];
        conditionOperator?: 'any' | 'all';
      }) => {
        if (ruleId == null || alertInstanceId == null) return;
        await muteAlert({
          ruleId,
          alertInstanceId,
          ...params,
        });
        onActionExecuted?.();
        refresh();
      },
      [alertInstanceId, muteAlert, onActionExecuted, refresh, ruleId]
    );

    if ((!isAlertActive && !isMuted) || ruleId == null || alertInstanceId == null) {
      return null;
    }

    // If already muted, show Unmute action
    if (isMuted) {
      return (
        <EuiContextMenuItem
          data-test-subj="unmute-alert"
          onClick={handleUnmute}
          size="s"
          disabled={!rule}
        >
          {!rule
            ? i18n.translate('xpack.triggersActionsUI.alertsTable.loadingMutedState', {
                defaultMessage: 'Loading muted state',
              })
            : UNMUTE}
        </EuiContextMenuItem>
      );
    }

    // If not muted, show Snooze... option with popover
    return (
      <AlertSnoozePopover
        isOpen={isSnoozePopoverOpen}
        onClose={() => setIsSnoozePopoverOpen(false)}
        button={
          <EuiContextMenuItem
            data-test-subj="snooze-alert"
            onClick={() => setIsSnoozePopoverOpen(!isSnoozePopoverOpen)}
            size="s"
            disabled={!rule}
          >
            {i18n.translate('xpack.responseOpsAlertsTable.actions.snooze', {
              defaultMessage: 'Snooze...',
            })}
          </EuiContextMenuItem>
        }
        onApplySnooze={handleApplySnooze}
        currentSeverity={currentSeverity}
        alertData={alert as Record<string, string[]>}
      />
    );
  }
);
