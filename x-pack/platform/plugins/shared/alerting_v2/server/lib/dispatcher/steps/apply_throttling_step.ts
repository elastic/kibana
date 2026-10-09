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
import { DispatchPlan, AlertTriage, PolicyCatalog } from '../state';
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
      alreadyNotified = [],
      policies = PolicyCatalog.empty(),
      triage = AlertTriage.empty(),
      input,
    } = state;
    const { dispatchable } = triage;

    if (groups.length === 0) {
      return {
        type: 'continue',
        data: {
          plan: DispatchPlan.of({ toDispatch: [], throttled: [], alreadyNotified, dispatchable }),
        },
      };
    }

    const lastNotifiedMap = await this.fetchLastNotifiedTimestamps(
      groups,
      policies,
      input.startedAt
    );

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
      data: {
        plan: DispatchPlan.of({ toDispatch: dispatch, throttled, alreadyNotified, dispatchable }),
      },
    };
  }

  private async fetchLastNotifiedTimestamps(
    groups: readonly ActionGroup[],
    policies: PolicyCatalog,
    startedAt: Date
  ): Promise<Map<ActionGroupId, LastNotifiedInfo>> {
    const lookups = groups.flatMap(({ id, policyId }) => {
      const policy = policies.get(policyId);
      const lookbackMs = policy ? notifiedLookbackMs(policy) : Infinity;
      return lookbackMs === undefined ? [] : [{ id, lookbackMs }];
    });
    const requests = [...Map.groupBy(lookups, ({ lookbackMs }) => lookbackMs)].flatMap(
      ([lookbackMs, groupLookups]) =>
        getLastNotifiedTimestampsQueries(groupLookups.map(({ id }) => id)).map(({ query }) => ({
          query,
          ...(Number.isFinite(lookbackMs)
            ? {
                filter: {
                  range: {
                    '@timestamp': { gte: new Date(startedAt.getTime() - lookbackMs).toISOString() },
                  },
                },
              }
            : {}),
        }))
    );
    const responses = await Promise.all(
      requests.map((request) => this.queryService.executeQueryRows<LastNotifiedRecord>(request))
    );
    const records = responses.flat();

    return new Map<ActionGroupId, LastNotifiedInfo>(
      records.map((record) => [
        record.action_group_id,
        {
          lastNotified: new Date(record.last_notified),
          alertStatus: record.alert_status,
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

const throttleStrategyOf = ({ throttle, groupingMode }: ActionPolicy) =>
  throttle?.strategy ?? (groupingMode === 'per_alert' ? 'on_status_change' : 'time_interval');

// An invalid interval keeps the full lookup so `shouldDispatch` still reports it.
const intervalMsOrInfinity = (interval: string): number => {
  try {
    return parseDurationToMs(interval);
  } catch {
    return Infinity;
  }
};

/**
 * How far back `shouldDispatch` reads `notified` records for a policy's groups: `undefined` when
 * it never reads them, `Infinity` when it needs every record. An interval bound gives the same
 * decision: a group whose last record is older than its interval dispatches either way.
 */
function notifiedLookbackMs(policy: ActionPolicy): number | undefined {
  const strategy = throttleStrategyOf(policy);
  const interval = policy.throttle?.interval;
  if (strategy === 'every_time') return undefined;
  if (policy.groupingMode !== 'per_alert') {
    return interval ? intervalMsOrInfinity(interval) : undefined;
  }
  return strategy === 'per_status_interval' && interval ? intervalMsOrInfinity(interval) : Infinity;
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
  const strategy = throttleStrategyOf(policy);

  if (strategy === 'every_time') return true;

  // Aggregate modes (per_field, all): throttle by interval only
  if (groupingMode !== 'per_alert') {
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

  // per_alert: always dispatch on status change
  const statusChanged = lastRecord.alertStatus !== group.alerts[0]?.alert_status;
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
