/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseStatuses } from '../../common/types/domain';
import { CasePersistedStatus } from '../../server/common/types/case';
import type {
  CaseStatusChange,
  CaseStatusHistoryFields,
} from '../../server/cases_analytics_v2/writer/status_history';
import { calculateStatusHistoryFields } from '../../server/cases_analytics_v2/writer/status_history';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export type DemoScenario = 'open' | 'in_progress' | 'direct_close' | 'resolved' | 'reopened';

/**
 * The share of each scenario. The reopened and the direct-close cases feed the status-history metrics.
 */
export const DEMO_SCENARIO_WEIGHTS: ReadonlyArray<[DemoScenario, number]> = [
  ['open', 0.15],
  ['in_progress', 0.15],
  ['direct_close', 0.2],
  ['resolved', 0.35],
  ['reopened', 0.15],
];

export interface DemoTimeline {
  scenario: DemoScenario;
  createdAt: string;
  statusChanges: CaseStatusChange[];
}

export interface DemoCaseTimeFields {
  status: CaseStatuses;
  persistedStatus: CasePersistedStatus;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  in_progress_at: string | null;
  duration: number | null;
  time_to_acknowledge: number | null;
  time_to_investigate: number | null;
  time_to_resolve: number | null;
  statusHistory: CaseStatusHistoryFields;
}

const PERSISTED_STATUS: Record<CaseStatuses, CasePersistedStatus> = {
  [CaseStatuses.open]: CasePersistedStatus.OPEN,
  [CaseStatuses['in-progress']]: CasePersistedStatus.IN_PROGRESS,
  [CaseStatuses.closed]: CasePersistedStatus.CLOSED,
};

const between = (random: () => number, minMs: number, maxMs: number): number =>
  minMs + Math.floor(random() * (maxMs - minMs));

export const pickDemoScenario = (random: () => number): DemoScenario => {
  const roll = random();
  let cumulative = 0;

  for (const [scenario, weight] of DEMO_SCENARIO_WEIGHTS) {
    cumulative += weight;
    if (roll < cumulative) {
      return scenario;
    }
  }

  return 'resolved';
};

const getStatusSteps = (
  scenario: DemoScenario,
  random: () => number
): Array<{ status: CaseStatuses; afterMs: number }> => {
  const pickup = () => between(random, 10 * MINUTE_MS, 8 * HOUR_MS);
  const work = () => between(random, HOUR_MS, 3 * DAY_MS);

  switch (scenario) {
    case 'open':
      return [];
    case 'in_progress':
      return [{ status: CaseStatuses['in-progress'], afterMs: pickup() }];
    case 'direct_close':
      return [{ status: CaseStatuses.closed, afterMs: between(random, 15 * MINUTE_MS, DAY_MS) }];
    case 'resolved':
      return [
        { status: CaseStatuses['in-progress'], afterMs: pickup() },
        { status: CaseStatuses.closed, afterMs: work() },
      ];
    case 'reopened':
      return [
        { status: CaseStatuses['in-progress'], afterMs: pickup() },
        { status: CaseStatuses.closed, afterMs: work() },
        { status: CaseStatuses.open, afterMs: between(random, DAY_MS, 5 * DAY_MS) },
        { status: CaseStatuses.closed, afterMs: between(random, 30 * MINUTE_MS, DAY_MS) },
      ];
  }
};

/**
 * Builds a random status time line for one demo case. The creation date is in the last `days` days.
 * A step that falls after now is dropped, so the case keeps the status of the last step before now.
 */
export const buildDemoTimeline = ({
  now,
  days,
  random,
}: {
  now: Date;
  days: number;
  random: () => number;
}): DemoTimeline => {
  const scenario = pickDemoScenario(random);
  const createdAtMs = now.getTime() - between(random, HOUR_MS, days * DAY_MS);
  const statusChanges: CaseStatusChange[] = [];
  let currentMs = createdAtMs;

  for (const { status, afterMs } of getStatusSteps(scenario, random)) {
    currentMs += afterMs;

    if (currentMs > now.getTime()) {
      break;
    }

    statusChanges.push({ status, timestamp: new Date(currentMs).toISOString() });
  }

  return { scenario, createdAt: new Date(createdAtMs).toISOString(), statusChanges };
};

export interface DemoAlertTimes {
  attachedAt: string;
  startedAt: string;
}

/**
 * Builds the attach time and the start time of each demo alert of one case, in attach order.
 * The first alert is attached in the first 2 minutes. No attach time is later than now.
 */
export const buildDemoAlertTimes = ({
  createdAt,
  count,
  now,
  random,
}: {
  createdAt: string;
  count: number;
  now: Date;
  random: () => number;
}): DemoAlertTimes[] => {
  const createdAtMs = Date.parse(createdAt);

  return Array.from({ length: count }, (_, position) => {
    const attachDelayMs =
      position === 0
        ? between(random, 0, 2 * MINUTE_MS)
        : between(random, 10 * MINUTE_MS, 2 * DAY_MS);
    const attachedAtMs = Math.min(createdAtMs + attachDelayMs, now.getTime());
    const startedAtMs = attachedAtMs - between(random, MINUTE_MS, 12 * HOUR_MS);

    return {
      attachedAt: new Date(attachedAtMs).toISOString(),
      startedAt: new Date(startedAtMs).toISOString(),
    };
  });
};

const secondsBetween = (end: string, start: string): number =>
  Math.floor((Date.parse(end) - Date.parse(start)) / 1000);

/**
 * Calculates the time fields of a case from its time line, in the same way as the cases client and the analytics writer.
 */
export const getDemoCaseTimeFields = (timeline: DemoTimeline, now: Date): DemoCaseTimeFields => {
  const { createdAt, statusChanges } = timeline;
  const lastChange = statusChanges[statusChanges.length - 1];
  const status = lastChange?.status ?? CaseStatuses.open;
  const inProgressAt =
    statusChanges.find((change) => change.status === CaseStatuses['in-progress'])?.timestamp ??
    null;
  const closedAt = status === CaseStatuses.closed ? lastChange.timestamp : null;

  let timing: Pick<
    DemoCaseTimeFields,
    'time_to_acknowledge' | 'time_to_investigate' | 'time_to_resolve'
  > = { time_to_acknowledge: null, time_to_investigate: null, time_to_resolve: null };

  if (closedAt != null) {
    const timeToResolve = secondsBetween(closedAt, createdAt);
    timing = {
      time_to_acknowledge:
        inProgressAt != null ? secondsBetween(inProgressAt, createdAt) : timeToResolve,
      time_to_investigate: inProgressAt != null ? secondsBetween(closedAt, inProgressAt) : 0,
      time_to_resolve: timeToResolve,
    };
  } else if (status === CaseStatuses['in-progress'] && inProgressAt != null) {
    timing = { ...timing, time_to_acknowledge: secondsBetween(inProgressAt, createdAt) };
  }

  return {
    status,
    persistedStatus: PERSISTED_STATUS[status],
    created_at: createdAt,
    updated_at: lastChange?.timestamp ?? createdAt,
    closed_at: closedAt,
    in_progress_at: inProgressAt,
    duration: closedAt != null ? secondsBetween(closedAt, createdAt) : null,
    ...timing,
    statusHistory: calculateStatusHistoryFields({ createdAt, statusChanges, now }),
  };
};

export interface DemoActivityEvent {
  timestamp: string;
  type: 'status' | 'assignees';
  verb: 'update' | 'add';
  status?: CaseStatuses;
  assigneeUids?: string[];
}

/**
 * Builds the status and assignee events of one demo case. The status events are the changes of the time line,
 * so the last event agrees with the status of the case. A case with assignees gets an assignee event at each
 * pickup. For each alert after the first pickup, the case moves to Open at the attach time and to In progress
 * again 1 to 10 hours later, if that pickup is before the last status change and before now.
 */
export const buildDemoActivityEvents = ({
  timeline,
  attachTimes,
  assigneeUids,
  now,
  random,
}: {
  timeline: DemoTimeline;
  attachTimes: readonly string[];
  assigneeUids: readonly string[];
  now: Date;
  random: () => number;
}): DemoActivityEvent[] => {
  const { statusChanges } = timeline;
  const events: DemoActivityEvent[] = [];
  const pickup = (timestamp: string) => {
    events.push({
      timestamp,
      type: 'status',
      verb: 'update',
      status: CaseStatuses['in-progress'],
    });

    if (assigneeUids.length > 0) {
      events.push({ timestamp, type: 'assignees', verb: 'add', assigneeUids: [...assigneeUids] });
    }
  };

  statusChanges.forEach(({ status, timestamp }) => {
    if (status === CaseStatuses['in-progress']) {
      pickup(timestamp);
    } else {
      events.push({ timestamp, type: 'status', verb: 'update', status });
    }
  });

  const firstPickup = statusChanges.find(
    ({ status }) => status === CaseStatuses['in-progress']
  )?.timestamp;
  const lastChange = statusChanges[statusChanges.length - 1]?.timestamp;

  if (firstPickup == null || lastChange == null) {
    return events;
  }

  let previousEndMs = Date.parse(firstPickup);

  [...attachTimes]
    .sort((first, second) => Date.parse(first) - Date.parse(second))
    .forEach((attachedAt) => {
      const attachedAtMs = Date.parse(attachedAt);
      const pickupMs = attachedAtMs + between(random, HOUR_MS, 10 * HOUR_MS);

      if (
        attachedAtMs > previousEndMs &&
        pickupMs < Date.parse(lastChange) &&
        pickupMs < now.getTime()
      ) {
        events.push({
          timestamp: attachedAt,
          type: 'status',
          verb: 'update',
          status: CaseStatuses.open,
        });
        pickup(new Date(pickupMs).toISOString());
        previousEndMs = pickupMs;
      }
    });

  return events.sort((first, second) => Date.parse(first.timestamp) - Date.parse(second.timestamp));
};
