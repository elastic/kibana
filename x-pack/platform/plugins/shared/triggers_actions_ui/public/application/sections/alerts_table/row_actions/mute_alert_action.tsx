/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem } from '@elastic/eui';
import React, { memo, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { ALERT_STATUS, ALERT_STATUS_ACTIVE } from '@kbn/rule-data-utils';
import { useMuteAlert } from '../hooks/alert_mute/use_mute_alert';
import type { AlertActionsProps } from '../../../../types';
import { MUTE, UNMUTE } from '../hooks/translations';
import { useUnmuteAlert } from '../hooks/alert_mute/use_unmute_alert';
import { useAlertMutedState } from '../hooks/alert_mute/use_alert_muted_state';

/**
 * Alerts table row action to mute/unmute the selected alert
 */
export const MuteAlertAction = memo(({ alert, refresh, onActionExecuted }: AlertActionsProps) => {
  const { isMuted, ruleId, rule, alertInstanceId } = useAlertMutedState(alert);
  const { mutateAsync: muteAlert } = useMuteAlert();
  const { mutateAsync: unmuteAlert } = useUnmuteAlert();
  const isAlertActive = useMemo(() => alert[ALERT_STATUS]?.[0] === ALERT_STATUS_ACTIVE, [alert]);

  const toggleAlert = useCallback(async () => {
    if (ruleId == null || alertInstanceId == null) {
      return;
    }
    if (isMuted) {
      await unmuteAlert({ ruleId, alertInstanceId });
    } else {
      await muteAlert({ ruleId, alertInstanceId });
    }
    onActionExecuted?.();
    refresh();
  }, [alertInstanceId, isMuted, muteAlert, onActionExecuted, refresh, ruleId, unmuteAlert]);

  if ((!isAlertActive && !isMuted) || ruleId == null || alertInstanceId == null) {
    return null;
  }

  return (
    <EuiContextMenuItem
      data-test-subj="toggle-alert"
      onClick={toggleAlert}
      size="s"
      disabled={!rule}
    >
      {!rule
        ? i18n.translate('xpack.triggersActionsUI.alertsTable.loadingMutedState', {
            defaultMessage: 'Loading muted state',
          })
        : isMuted
        ? UNMUTE
        : MUTE}
    </EuiContextMenuItem>
  );
});
