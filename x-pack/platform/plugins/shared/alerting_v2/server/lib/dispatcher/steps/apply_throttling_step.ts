/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { parseDurationToMs } from '../../duration';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import type { QueryServiceContract } from '../../services/query_service/query_service';
import { QueryServiceInternalToken } from '../../services/query_service/tokens';
import { getLastNotifiedTimestampsQuery } from '../queries';
import type {
  DispatcherPipelineState,
  DispatcherStep,
  DispatcherStepOutput,
  LastNotifiedInfo,
  LastNotifiedRecord,
  NotificationGroup,
  NotificationGroupId,
  NotificationPolicy,
  NotificationPolicyId,
} from '../types';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Minimum lookback for the last-notified query. Covers the `on_status_change` strategy
 * (which has no interval) when an episode has been stable for a while: a spurious
 * re-notification at this cadence is acceptable and acts as a "still active" signal.
 */
export const LAST_NOTIFIED_LOOKBACK_FLOOR_MS = ONE_DAY_MS;

/**
 * Hard cap on the lookback, protecting against pathological policy configurations
 * (e.g. a multi-year throttle interval) that would otherwise re-expand the query
 * toward a full data-stream scan.
 */
export const LAST_NOTIFIED_LOOKBACK_CEILING_MS = 90 * ONE_DAY_MS;

/**
 * Headroom on top of the longest configured throttle interval. A record at exactly
 * the interval boundary is no longer "within interval", but the factor gives us a
 * safety margin against clock skew and pipeline latency.
 */
export const LAST_NOTIFIED_LOOKBACK_SAFETY_FACTOR = 1.2;

/**
 * Derives the lookback window for `getLastNotifiedTimestampsQuery` from the currently
 * enabled notification policies. Throttling decisions only need history within the
 * longest configured throttle interval; anything older cannot change the outcome.
 *
 * Policies with malformed interval strings are skipped (not fatal) so a single bad
 * policy cannot break throttling for the rest.
 */
export function computeLastNotifiedLookbackMs(
  policies: ReadonlyMap<NotificationPolicyId, NotificationPolicy>,
  logger?: LoggerServiceContract
): number {
  let maxIntervalMs = 0;

  for (const policy of policies.values()) {
    const interval = policy.throttle?.interval;
    if (!interval) continue;
    try {
      const ms = parseDurationToMs(interval);
      if (ms > maxIntervalMs) maxIntervalMs = ms;
    } catch {
      // Intentionally swallow: invalid interval strings are handled defensively here
      // so throttling for other policies keeps working.
    }
  }

  const desiredMs = maxIntervalMs * LAST_NOTIFIED_LOOKBACK_SAFETY_FACTOR;
  const clampedMs = Math.min(
    LAST_NOTIFIED_LOOKBACK_CEILING_MS,
    Math.max(LAST_NOTIFIED_LOOKBACK_FLOOR_MS, desiredMs)
  );

  if (desiredMs > LAST_NOTIFIED_LOOKBACK_CEILING_MS) {
    logger?.warn({
      message: () =>
        `Notification policy throttle interval (~${Math.round(
          maxIntervalMs / ONE_DAY_MS
        )}d) exceeds the maximum supported last-notified lookback (${Math.round(
          LAST_NOTIFIED_LOOKBACK_CEILING_MS / ONE_DAY_MS
        )}d); clamping. Throttling for policies with longer intervals may allow spurious re-notification.`,
    });
  }

  return clampedMs;
}

@injectable()
export class ApplyThrottlingStep implements DispatcherStep {
  public readonly name = 'apply_throttling';

  constructor(
    @inject(QueryServiceInternalToken) private readonly queryService: QueryServiceContract,
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract
  ) {}

  public async execute(state: Readonly<DispatcherPipelineState>): Promise<DispatcherStepOutput> {
    const { groups = [], policies = new Map(), input } = state;

    if (groups.length === 0) {
      return { type: 'continue', data: { dispatch: [], throttled: [] } };
    }

    const lookbackMs = computeLastNotifiedLookbackMs(policies, this.logger);
    const since = new Date(input.startedAt.getTime() - lookbackMs);

    const lastNotifiedMap = await this.fetchLastNotifiedTimestamps(
      groups.map((g) => g.id),
      since
    );

    const { dispatch, throttled } = applyThrottling(
      groups,
      policies,
      lastNotifiedMap,
      input.startedAt
    );

    this.logger.debug({
      message: () =>
        `Applied throttling to ${throttled.length} groups and dispatched ${dispatch.length} groups`,
    });

    return { type: 'continue', data: { dispatch, throttled } };
  }

  private async fetchLastNotifiedTimestamps(
    notificationGroupIds: NotificationGroupId[],
    since: Date
  ): Promise<Map<NotificationGroupId, LastNotifiedInfo>> {
    const records = await this.queryService.executeQueryRows<LastNotifiedRecord>({
      query: getLastNotifiedTimestampsQuery(notificationGroupIds, since).query,
    });

    return new Map<NotificationGroupId, LastNotifiedInfo>(
      records.map((record) => [
        record.notification_group_id,
        {
          lastNotified: new Date(record.last_notified),
          episodeStatus: record.episode_status,
        },
      ])
    );
  }
}

export function applyThrottling(
  groups: readonly NotificationGroup[],
  policies: ReadonlyMap<string, NotificationPolicy>,
  lastNotifiedMap: ReadonlyMap<NotificationGroupId, LastNotifiedInfo>,
  now: Date
): { dispatch: NotificationGroup[]; throttled: NotificationGroup[] } {
  const dispatch: NotificationGroup[] = [];
  const throttled: NotificationGroup[] = [];

  for (const group of groups) {
    const policy = policies.get(group.policyId)!;
    const bucket = shouldDispatch(group, policy, lastNotifiedMap.get(group.id), now)
      ? dispatch
      : throttled;
    bucket.push(group);
  }

  return { dispatch, throttled };
}

function shouldDispatch(
  group: NotificationGroup,
  policy: NotificationPolicy,
  lastRecord: LastNotifiedInfo | undefined,
  now: Date
): boolean {
  if (!lastRecord) return true;

  const groupingMode = policy.groupingMode ?? 'per_episode';
  const strategy =
    policy.throttle?.strategy ??
    (groupingMode === 'per_episode' ? 'on_status_change' : 'time_interval');

  if (strategy === 'every_time') return true;

  // Aggregate modes (per_field, all): throttle by interval only
  if (groupingMode !== 'per_episode') {
    return (
      !policy.throttle?.interval ||
      !isWithinInterval(lastRecord.lastNotified, policy.throttle.interval, now)
    );
  }

  // per_episode: always dispatch on status change
  const statusChanged = lastRecord.episodeStatus !== group.episodes[0]?.episode_status;
  if (statusChanged) return true;

  // per_status_interval: also dispatch when interval has elapsed
  if (strategy === 'per_status_interval') {
    return (
      !!policy.throttle?.interval &&
      !isWithinInterval(lastRecord.lastNotified, policy.throttle.interval, now)
    );
  }

  // on_status_change with no change → throttle
  return false;
}

function isWithinInterval(lastNotifiedAt: Date, interval: string, now: Date): boolean {
  try {
    const intervalMillis = parseDurationToMs(interval);
    return lastNotifiedAt.getTime() + intervalMillis > now.getTime();
  } catch {
    return false;
  }
}
