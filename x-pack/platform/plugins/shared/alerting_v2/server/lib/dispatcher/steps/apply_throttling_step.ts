/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { parseDurationToMs } from '../../duration';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import type { LoggerServiceContract } from '../../services/logger_service/logger_service';
import type { QueryServiceContract } from '../../services/query_service/query_service';
import { QueryServiceInternalToken } from '../../services/query_service/tokens';
import { getLastNotifiedTimestampsQueries } from '../queries';
import { DispatchPlan, EpisodeTriage, PolicyCatalog } from '../state';
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
    @inject(QueryServiceInternalToken) private readonly queryService: QueryServiceContract
  ) {}

  public async execute(
    state: Readonly<DispatcherPipelineState>,
    logger: LoggerServiceContract
  ): Promise<DispatcherStepOutput> {
    const {
      groups = [],
      policies = PolicyCatalog.empty(),
      triage = EpisodeTriage.empty(),
      input,
    } = state;
    const { dispatchable } = triage;

    if (groups.length === 0) {
      return {
        type: 'continue',
        data: { plan: DispatchPlan.of({ toDispatch: [], throttled: [], dispatchable }) },
      };
    }

    const lastNotifiedMap = await this.fetchLastNotifiedTimestamps(groups.map((g) => g.id));

    const { dispatch, throttled } = applyThrottling(
      groups,
      policies,
      lastNotifiedMap,
      input.startedAt,
      logger
    );

    logger.debug({ message: 'Applied throttling' });

    return {
      type: 'continue',
      data: { plan: DispatchPlan.of({ toDispatch: dispatch, throttled, dispatchable }) },
    };
  }

  private async fetchLastNotifiedTimestamps(
    actionGroupIds: ActionGroupId[]
  ): Promise<Map<ActionGroupId, LastNotifiedInfo>> {
    const queries = getLastNotifiedTimestampsQueries(actionGroupIds);
    const responses = await Promise.all(
      queries.map((request) =>
        this.queryService.executeQueryRows<LastNotifiedRecord>({ query: request.query })
      )
    );
    const records = responses.flat();

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
  policies: PolicyCatalog,
  lastNotifiedMap: ReadonlyMap<ActionGroupId, LastNotifiedInfo>,
  now: Date,
  logger?: LoggerServiceContract
): { dispatch: ActionGroup[]; throttled: ActionGroup[] } {
  const dispatch: ActionGroup[] = [];
  const throttled: ActionGroup[] = [];
  const reportInvalidInterval = createInvalidIntervalReporter(logger);

  for (const group of groups) {
    const policy = policies.get(group.policyId)!;
    const bucket = shouldDispatch(
      group,
      policy,
      lastNotifiedMap.get(group.id),
      now,
      reportInvalidInterval
    )
      ? dispatch
      : throttled;
    bucket.push(group);
  }

  return { dispatch, throttled };
}

/**
 * A single misconfigured interval would otherwise warn once per group, and one
 * policy can cover thousands of groups in a tick.
 */
function createInvalidIntervalReporter(
  logger?: LoggerServiceContract
): (policyId: string, error: unknown) => void {
  const reported = new Set<string>();

  return (policyId, error) => {
    if (!logger || reported.has(policyId)) {
      return;
    }

    reported.add(policyId);
    logger.warn({
      message: 'Action policy throttle interval is invalid',
      error,
      code: ALERTING_LOG_CODES.DISPATCH_THROTTLE_INTERVAL_INVALID,
      labels: { policy_id: policyId },
    });
  };
}

function shouldDispatch(
  group: ActionGroup,
  policy: ActionPolicy,
  lastRecord: LastNotifiedInfo | undefined,
  now: Date,
  reportInvalidInterval: (policyId: string, error: unknown) => void
): boolean {
  if (!lastRecord) return true;

  const { groupingMode } = policy;
  const strategy =
    policy.throttle?.strategy ??
    (groupingMode === 'per_episode' ? 'on_status_change' : 'time_interval');

  if (strategy === 'every_time') return true;

  // Aggregate modes (per_field, all): throttle by interval only
  if (groupingMode !== 'per_episode') {
    return (
      !policy.throttle?.interval ||
      !isWithinInterval(
        lastRecord.lastNotified,
        policy.throttle.interval,
        now,
        policy.id,
        reportInvalidInterval
      )
    );
  }

  // per_episode: always dispatch on status change
  const statusChanged = lastRecord.episodeStatus !== group.episodes[0]?.episode_status;
  if (statusChanged) return true;

  // per_status_interval: also dispatch when interval has elapsed
  if (strategy === 'per_status_interval') {
    return (
      !!policy.throttle?.interval &&
      !isWithinInterval(
        lastRecord.lastNotified,
        policy.throttle.interval,
        now,
        policy.id,
        reportInvalidInterval
      )
    );
  }

  // on_status_change with no change → throttle
  return false;
}

function isWithinInterval(
  lastNotifiedAt: Date,
  interval: string,
  now: Date,
  policyId: string,
  reportInvalidInterval: (policyId: string, error: unknown) => void
): boolean {
  try {
    const intervalMillis = parseDurationToMs(interval);
    return lastNotifiedAt.getTime() + intervalMillis > now.getTime();
  } catch (error) {
    reportInvalidInterval(policyId, error);
    return false;
  }
}
