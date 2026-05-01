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
  ActionGroup,
  ActionGroupId,
  ActionPolicy,
  DispatcherPipelineState,
  DispatcherStep,
  DispatcherStepOutput,
  LastNotifiedInfo,
  LastNotifiedRecord,
} from '../types';

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

    const lastNotifiedMap = await this.fetchLastNotifiedTimestamps(groups.map((g) => g.id));

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
    actionGroupIds: ActionGroupId[]
  ): Promise<Map<ActionGroupId, LastNotifiedInfo>> {
    const records = await this.queryService.executeQueryRows<LastNotifiedRecord>({
      query: getLastNotifiedTimestampsQuery(actionGroupIds).query,
    });

    return new Map<ActionGroupId, LastNotifiedInfo>(
      records.map((record) => [
        record.action_group_id,
        {
          lastNotified: new Date(record.last_notified),
          episodeStatus: record.episode_status,
        },
      ])
    );
  }
}

export function applyThrottling(
  groups: readonly ActionGroup[],
  policies: ReadonlyMap<string, ActionPolicy>,
  lastNotifiedMap: ReadonlyMap<ActionGroupId, LastNotifiedInfo>,
  now: Date
): { dispatch: ActionGroup[]; throttled: ActionGroup[] } {
  const dispatch: ActionGroup[] = [];
  const throttled: ActionGroup[] = [];

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
  group: ActionGroup,
  policy: ActionPolicy,
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
