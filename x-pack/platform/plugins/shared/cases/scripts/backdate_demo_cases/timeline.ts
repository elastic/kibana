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
