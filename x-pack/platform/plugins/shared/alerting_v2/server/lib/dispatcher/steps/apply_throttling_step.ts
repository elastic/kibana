/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type {
  LastNotifiedRecord,
  NotificationGroup,
  NotificationGroupId,
  NotificationPolicy,
  DispatcherStep,
  DispatcherPipelineState,
  DispatcherStepOutput,
} from '../types';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import type { QueryServiceContract } from '../../services/query_service/query_service';
import { QueryServiceInternalToken } from '../../services/query_service/tokens';
import { queryResponseToRecords } from '../../services/query_service/query_response_to_records';
import { getLastNotifiedTimestampsQuery } from '../queries';
import { parseDurationToMs } from '../../duration';

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
    notificationGroupIds: NotificationGroupId[]
  ): Promise<Map<NotificationGroupId, Date>> {
    const result = await this.queryService.executeQuery({
      query: getLastNotifiedTimestampsQuery(notificationGroupIds).query,
    });

    const records = queryResponseToRecords<LastNotifiedRecord>(result);
    return new Map<NotificationGroupId, Date>(
      records.map((record) => [record.notification_group_id, new Date(record.last_notified)])
    );
  }
}

export function applyThrottling(
  groups: readonly NotificationGroup[],
  policies: ReadonlyMap<string, NotificationPolicy>,
  lastNotifiedMap: ReadonlyMap<NotificationGroupId, Date>,
  now: Date
): { dispatch: NotificationGroup[]; throttled: NotificationGroup[] } {
  const dispatch: NotificationGroup[] = [];
  const throttled: NotificationGroup[] = [];

  for (const group of groups) {
    const policy = policies.get(group.policyId)!;
    const lastNotified = lastNotifiedMap.get(group.id);

    if (
      lastNotified &&
      policy.throttle &&
      policy.throttle.interval &&
      isWithinInterval(lastNotified, policy.throttle.interval, now)
    ) {
      throttled.push(group);
    } else {
      dispatch.push(group);
    }
  }

  return { dispatch, throttled };
}

function isWithinInterval(lastNotifiedAt: Date, interval: string, now: Date): boolean {
  try {
    const intervalMillis = parseDurationToMs(interval);
    return lastNotifiedAt.getTime() + intervalMillis > now.getTime();
  } catch {
    return false;
  }
}
