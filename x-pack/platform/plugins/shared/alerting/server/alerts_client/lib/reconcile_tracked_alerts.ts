/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { Alert } from '@kbn/alerts-as-data-utils';
import {
  ALERT_CONSECUTIVE_MATCHES,
  ALERT_DURATION,
  ALERT_FLAPPING,
  ALERT_FLAPPING_HISTORY,
  ALERT_MAINTENANCE_WINDOW_IDS,
  ALERT_MAINTENANCE_WINDOW_NAMES,
  ALERT_PENDING_RECOVERED_COUNT,
  ALERT_SCHEDULED_ACTION_DATE,
  ALERT_SCHEDULED_ACTION_GROUP,
  ALERT_SCHEDULED_ACTION_THROTTLING,
  ALERT_START,
  ALERT_STATE_NAMESPACE,
  ALERT_UUID,
} from '@kbn/rule-data-utils';
import { get, isPlainObject } from 'lodash';
import type { RawAlertInstance, RuleAlertData } from '../../types';
import type { TrackedAADAlerts } from '../types';
import { retryTransientEsErrors } from '../../lib/retry_transient_es_errors';
import type { TrackedAlertsSearch } from './get_tracked_alerts';
import {
  createEmptyTrackedAlerts,
  fetchAlertsByIds,
  fetchTrackedAlerts,
  findMissingAlertUuids,
  getAlertUuidsFromState,
  populateTrackedAlerts,
} from './get_tracked_alerts';

const MAX_LOGGED_INSTANCE_IDS = 10;

interface LogContext {
  logger: Logger;
  ruleInfoMessage: string;
  logTags: { tags: string[] };
}

export interface ReconcileTrackedAlertsWithStateParams<AlertData extends RuleAlertData>
  extends LogContext {
  ruleId: string;
  activeAlertsFromState: Record<string, RawAlertInstance>;
  recoveredAlertsFromState: Record<string, RawAlertInstance>;
  maxAlerts: number;
  search: TrackedAlertsSearch<AlertData>;
}

export interface ReconcileTrackedAlertsWithStateResult<AlertData extends RuleAlertData>
  extends RestoreStateFromTrackedAlertsResult {
  trackedAlerts: TrackedAADAlerts<AlertData>;
}

/**
 * Loads the rule's tracked alert documents and makes them and the task state agree before
 * the rule runs, so neither side is missing an alert the other one knows about.
 */
export async function reconcileTrackedAlertsWithState<AlertData extends RuleAlertData>({
  ruleId,
  activeAlertsFromState,
  recoveredAlertsFromState,
  maxAlerts,
  search,
  logger,
  ruleInfoMessage,
  logTags,
}: ReconcileTrackedAlertsWithStateParams<AlertData>): Promise<
  ReconcileTrackedAlertsWithStateResult<AlertData>
> {
  const logContext = { logger, ruleInfoMessage, logTags };
  const searchWithRetry: TrackedAlertsSearch<AlertData> = (queryBody) =>
    retryTransientEsErrors(() => search(queryBody), { logger });

  // 1. Load every document the rule still tracks. A failure here fails the run.
  const trackedAlerts = createEmptyTrackedAlerts<AlertData>();
  const hits = await fetchTrackedAlerts({ ruleId, search: searchWithRetry });
  populateTrackedAlerts(trackedAlerts, hits);

  // 2. State knows an alert the query missed: fetch its document by id.
  await fetchTrackedAlertsMissingFromIndex({
    ruleId,
    trackedAlerts,
    activeAlertsFromState,
    recoveredAlertsFromState,
    search: searchWithRetry,
    ...logContext,
  });

  // 3. A document exists but state does not know the alert: put it back into state.
  const restored = restoreStateFromTrackedAlerts({
    trackedAlerts,
    activeAlertsFromState,
    recoveredAlertsFromState,
    maxAlerts,
    ...logContext,
  });

  return { trackedAlerts, ...restored };
}

// Documents written before `kibana.alert.tracked` existed are not returned by the tracked
// query, so fetch them by the uuids in task state. Best effort: errors are logged, not thrown.
async function fetchTrackedAlertsMissingFromIndex<AlertData extends RuleAlertData>({
  ruleId,
  trackedAlerts,
  activeAlertsFromState,
  recoveredAlertsFromState,
  search,
  logger,
  ruleInfoMessage,
  logTags,
}: {
  ruleId: string;
  trackedAlerts: TrackedAADAlerts<AlertData>;
  activeAlertsFromState: Record<string, RawAlertInstance>;
  recoveredAlertsFromState: Record<string, RawAlertInstance>;
  search: TrackedAlertsSearch<AlertData>;
} & LogContext): Promise<void> {
  const alertUuidsFromState = getAlertUuidsFromState(
    activeAlertsFromState,
    recoveredAlertsFromState
  );
  const missingUuids = findMissingAlertUuids(alertUuidsFromState, trackedAlerts);
  if (missingUuids.length === 0) {
    return;
  }

  logger.warn(
    `Found ${missingUuids.length} alerts in task state not returned by tracked alerts query ${ruleInfoMessage}. Fetching them directly to restore tracking info.`,
    logTags
  );
  try {
    const missingHits = await fetchAlertsByIds({ ruleId, alertUuids: missingUuids, search });
    populateTrackedAlerts(trackedAlerts, missingHits);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error(`Error fetching missing tracked alerts ${ruleInfoMessage} - ${errorMessage}`, {
      tags: logTags.tags,
      error: { stack_trace: err.stack },
    });
  }
}

export interface RestoreStateFromTrackedAlertsParams<AlertData extends RuleAlertData>
  extends LogContext {
  trackedAlerts: TrackedAADAlerts<AlertData>;
  activeAlertsFromState: Record<string, RawAlertInstance>;
  recoveredAlertsFromState: Record<string, RawAlertInstance>;
  maxAlerts: number;
}

export interface RestoreStateFromTrackedAlertsResult {
  activeAlertsFromState: Record<string, RawAlertInstance>;
  recoveredAlertsFromState: Record<string, RawAlertInstance>;
  restoredInstanceIds: string[];
  skippedInstanceIds: string[];
}

/**
 * Rebuilds task state entries for active and delayed documents the state does not know.
 * This happens when a run persisted its alerts and died before its state was saved. Without
 * this, the next run would treat the alert as new and create a second document.
 */
export function restoreStateFromTrackedAlerts<AlertData extends RuleAlertData>({
  trackedAlerts,
  activeAlertsFromState,
  recoveredAlertsFromState,
  maxAlerts,
  logger,
  ruleInfoMessage,
  logTags,
}: RestoreStateFromTrackedAlertsParams<AlertData>): RestoreStateFromTrackedAlertsResult {
  const restoredInstanceIds: string[] = [];
  const skippedInstanceIds: string[] = [];
  // Both maps are copied on the first change only, so the common case returns them untouched.
  let reconciledActive = activeAlertsFromState;
  let reconciledRecovered = recoveredAlertsFromState;
  let reconciledCount: number | undefined;

  const restore = (instanceId: string, uuid: string) => {
    if (reconciledActive[instanceId]) {
      return;
    }
    // State already recovered this very document; only its recovery write was lost.
    // buildUpdatedRecoveredAlert repairs the document, restoring it would recover it twice.
    if (reconciledRecovered[instanceId]?.meta?.uuid === uuid) {
      return;
    }
    reconciledCount ??= Object.keys(activeAlertsFromState).length;
    if (reconciledCount >= maxAlerts) {
      skippedInstanceIds.push(instanceId);
      return;
    }
    if (reconciledActive === activeAlertsFromState) {
      reconciledActive = { ...activeAlertsFromState };
    }
    reconciledActive[instanceId] = alertDocToRawAlertInstance(trackedAlerts.all[uuid]);
    reconciledCount++;
    restoredInstanceIds.push(instanceId);

    // The restored document is a newer lifecycle than the recovered entry. Left in state,
    // the older entry would win in setFlappingHistoryAndTrackedAlerts once the alert
    // recovers again and send the recovery write to the old document.
    if (reconciledRecovered[instanceId]) {
      if (reconciledRecovered === recoveredAlertsFromState) {
        reconciledRecovered = { ...recoveredAlertsFromState };
      }
      delete reconciledRecovered[instanceId];
    }
  };

  // Active first, so an instance with both an active and a delayed document keeps the active one.
  for (const [instanceId, uuid] of Object.entries(trackedAlerts.instanceIdIndex.active)) {
    restore(instanceId, uuid);
  }
  for (const [instanceId, uuid] of Object.entries(trackedAlerts.instanceIdIndex.delayed)) {
    restore(instanceId, uuid);
  }

  if (restoredInstanceIds.length > 0) {
    logger.warn(
      `Restored ${
        restoredInstanceIds.length
      } tracked alert(s) missing from task state ${ruleInfoMessage}: ${formatInstanceIds(
        restoredInstanceIds
      )}`,
      logTags
    );
  }
  if (skippedInstanceIds.length > 0) {
    logger.warn(
      `Skipped restoring ${
        skippedInstanceIds.length
      } tracked alert(s) missing from task state because the max alert limit (${maxAlerts}) was reached ${ruleInfoMessage}: ${formatInstanceIds(
        skippedInstanceIds
      )}`,
      logTags
    );
  }

  return {
    activeAlertsFromState: reconciledActive,
    recoveredAlertsFromState: reconciledRecovered,
    restoredInstanceIds,
    skippedInstanceIds,
  };
}

/**
 * Maps an alert document back to the task state shape the legacy alerts client reads.
 */
export function alertDocToRawAlertInstance(alertDoc: Alert): RawAlertInstance {
  const start = get(alertDoc, ALERT_START) as string | undefined;
  const durationMicros = get(alertDoc, ALERT_DURATION) as number | undefined;
  const ruleTypeState = get(alertDoc, ALERT_STATE_NAMESPACE);
  const scheduledActionGroup = get(alertDoc, ALERT_SCHEDULED_ACTION_GROUP) as string | undefined;
  const scheduledActionDate = get(alertDoc, ALERT_SCHEDULED_ACTION_DATE) as string | undefined;
  const scheduledActionThrottling = get(alertDoc, ALERT_SCHEDULED_ACTION_THROTTLING) as
    | Record<string, { date: string }>
    | undefined;

  const meta: NonNullable<RawAlertInstance['meta']> = {
    uuid: get(alertDoc, ALERT_UUID),
    flappingHistory: get(alertDoc, ALERT_FLAPPING_HISTORY) ?? [],
    maintenanceWindowIds: get(alertDoc, ALERT_MAINTENANCE_WINDOW_IDS) ?? [],
    maintenanceWindowNames: get(alertDoc, ALERT_MAINTENANCE_WINDOW_NAMES) ?? [],
    ...definedOnly({
      flapping: get(alertDoc, ALERT_FLAPPING) as boolean | undefined,
      activeCount: get(alertDoc, ALERT_CONSECUTIVE_MATCHES) as number | undefined,
      pendingRecoveredCount: get(alertDoc, ALERT_PENDING_RECOVERED_COUNT) as number | undefined,
    }),
    ...(scheduledActionGroup && scheduledActionDate
      ? {
          lastScheduledActions: {
            group: scheduledActionGroup,
            date: scheduledActionDate,
            ...(scheduledActionThrottling ? { actions: scheduledActionThrottling } : {}),
          },
        }
      : {}),
  };

  return {
    state: {
      ...(isPlainObject(ruleTypeState) ? ruleTypeState : {}),
      ...(start ? { start, duration: microsToNanos(durationMicros) } : {}),
    },
    meta,
  };
}

// The alert document stores duration in microseconds; task state keeps a nanosecond string.
function microsToNanos(micros: number | undefined): string {
  if (typeof micros !== 'number' || !Number.isFinite(micros)) {
    return '0';
  }
  return (BigInt(Math.trunc(micros)) * BigInt(1000)).toString();
}

// Drops undefined values so missing document fields are not written into state as undefined.
function definedOnly<T extends Record<string, unknown>>(values: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}

// Keeps log lines bounded for rules with many alerts.
function formatInstanceIds(instanceIds: string[]): string {
  const shown = instanceIds.slice(0, MAX_LOGGED_INSTANCE_IDS).join(', ');
  const remaining = instanceIds.length - MAX_LOGGED_INSTANCE_IDS;
  return remaining > 0 ? `${shown} and ${remaining} more` : shown;
}
