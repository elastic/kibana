/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import { useMuteAlertInstance } from '@kbn/response-ops-alerts-apis/hooks/use_mute_alert_instance';
import { useUnmuteAlertInstance } from '@kbn/response-ops-alerts-apis/hooks/use_unmute_alert_instance';
import { useSnoozeAlertInstance } from '@kbn/response-ops-alerts-apis/hooks/use_snooze_alert_instance';
import { useUnsnoozeAlertInstance } from '@kbn/response-ops-alerts-apis/hooks/use_unsnooze_alert_instance';
import type { SnoozeCondition } from '@kbn/response-ops-alerts-apis/types';
import type { AlertSnoozePayload } from '../components/use_snooze_form';

export interface UseAlertSnoozeParams {
  http: HttpStart;
  notifications: NotificationsStart;
  ruleId?: string;
  instanceId?: string;
  /** Whether the alert instance is currently muted (indefinite snooze). */
  isMuted?: boolean;
  /** Whether the alert instance currently has a time/condition based snooze. */
  isSnoozed?: boolean;
  /** Called after a successful snooze/unsnooze, e.g. to refetch snooze state. */
  onSuccess?: () => void;
  /**
   * Run the underlying mutations against the default react-query context instead
   * of `AlertsQueryContext`. Needed for consumers without an `AlertsQueryContext`
   * provider (e.g. the alert details page).
   */
  skipAlertsQueryContext?: boolean;
}

export interface UseAlertSnoozeResult {
  /** Applies a snooze payload, choosing the mute vs snooze API automatically. */
  snoozeAlert: (payload: AlertSnoozePayload) => Promise<boolean>;
  /** Clears any mute and/or snooze currently applied to the alert instance. */
  unsnoozeAlert: () => Promise<boolean>;
}

/**
 * Encapsulates the per-alert snooze business rules so consumers don't need to
 * know how snooze maps onto the underlying alerting APIs:
 *  - "Snooze indefinitely" with no conditions reuses the mute API.
 *  - Any time-based or condition-based snooze uses the snooze API.
 *  - Unsnooze reverses whichever of mute/snooze is currently applied.
 *
 * It delegates the actual requests (and their success/error toasts) to the
 * shared `@kbn/response-ops-alerts-apis` mutation hooks. Use `onSuccess` to
 * refresh any cached snooze state.
 *
 * Each action resolves to `true` on success and `false` when it was skipped
 * (missing ids) or failed, so callers can gate UI side effects like closing a
 * popover.
 */
export const useAlertSnooze = ({
  http,
  notifications,
  ruleId,
  instanceId,
  isMuted = false,
  isSnoozed = false,
  onSuccess,
  skipAlertsQueryContext,
}: UseAlertSnoozeParams): UseAlertSnoozeResult => {
  const { mutateAsync: muteInstance } = useMuteAlertInstance({
    http,
    notifications,
    skipAlertsQueryContext,
  });
  const { mutateAsync: unmuteInstance } = useUnmuteAlertInstance({
    http,
    notifications,
    skipAlertsQueryContext,
  });
  const { mutateAsync: snoozeInstance } = useSnoozeAlertInstance({
    http,
    notifications,
    skipAlertsQueryContext,
  });
  const { mutateAsync: unsnoozeInstance } = useUnsnoozeAlertInstance({
    http,
    notifications,
    skipAlertsQueryContext,
  });

  const snoozeAlert = useCallback(
    async (payload: AlertSnoozePayload): Promise<boolean> => {
      if (!ruleId || !instanceId) return false;
      try {
        if (payload.expiresAt === null && !payload.conditions?.length) {
          await muteInstance({ ruleId, alertInstanceId: instanceId });
        } else {
          await snoozeInstance({
            ruleId,
            alertInstanceId: instanceId,
            ...(payload.expiresAt !== undefined && { expiresAt: payload.expiresAt ?? undefined }),
            ...(payload.conditions?.length && {
              conditions: payload.conditions as SnoozeCondition[],
              conditionOperator: payload.conditionOperator,
            }),
          });
        }
        onSuccess?.();
        return true;
      } catch {
        return false;
      }
    },
    [instanceId, muteInstance, onSuccess, ruleId, snoozeInstance]
  );

  const unsnoozeAlert = useCallback(async (): Promise<boolean> => {
    if (!ruleId || !instanceId) return false;
    try {
      if (isMuted) {
        await unmuteInstance({ ruleId, alertInstanceId: instanceId });
      }
      if (isSnoozed) {
        await unsnoozeInstance({ ruleId, alertInstanceId: instanceId });
      }
      onSuccess?.();
      return true;
    } catch {
      return false;
    }
  }, [instanceId, isMuted, isSnoozed, onSuccess, ruleId, unmuteInstance, unsnoozeInstance]);

  return { snoozeAlert, unsnoozeAlert };
};
