/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ActivityEntry,
  EntityItem,
  InvestigationItem,
  InvestigationRecord,
} from '../../../../common/investigations/types';
import * as i18n from './translations';

/** An agent that logged activity this recently counts as working. */
export const AGENT_ACTIVE_WINDOW_MS = 2 * 60 * 1000;

export const isEntity = (item: InvestigationItem): item is EntityItem => item.kind === 'entity';

const CRITICALITY_ORDER = ['extreme', 'high', 'medium', 'low'] as const;

const criticalityRank = (criticality: string | null | undefined): number =>
  criticality
    ? CRITICALITY_ORDER.findIndex((level) => criticality.toLowerCase().includes(level))
    : -1;

export interface ScopeSummary {
  hosts: number;
  suspectedHosts: number;
  identities: number;
  highest: { criticality: string; name: string; isSuspected: boolean } | null;
}

/** Hosts, identities and the highest criticality among the entities that are not dismissed. */
export const summarizeScope = (entities: readonly EntityItem[]): ScopeSummary => {
  const inRange = entities.filter(({ status }) => status !== 'dismissed');
  const hosts = inRange.filter(({ entity }) => entity.type === 'host');
  const suspectedHosts = hosts.filter(({ status }) => status === 'suspected').length;
  const identities = inRange.filter(
    ({ entity }) => entity.type === 'user' || entity.type === 'nhi'
  );

  let highest: ScopeSummary['highest'] = null;
  let highestRank = Number.POSITIVE_INFINITY;
  for (const item of inRange.filter(({ entity }) => entity.type !== 'external')) {
    const rank = criticalityRank(item.entity.criticality);
    if (rank > -1 && rank < highestRank) {
      highestRank = rank;
      highest = {
        criticality: item.entity.criticality ?? '',
        name: item.entity.name,
        isSuspected: item.status === 'suspected',
      };
    }
  }

  return {
    hosts: hosts.length - suspectedHosts,
    suspectedHosts,
    identities: identities.length,
    highest,
  };
};

/** What the person should do next, in the order the prototype lists it. */
export const getNextSteps = (record: InvestigationRecord): string[] => {
  const { counters } = record;
  if (record.status === 'closed') {
    return [i18n.NEXT_REOPEN];
  }
  const steps: string[] = [];
  const openOrBlocked =
    (counters.claims_by_status.open ?? 0) + (counters.claims_by_status.blocked ?? 0);

  if (!record.owner) {
    steps.push(i18n.NEXT_TAKE_OWNERSHIP);
  }
  if (counters.claims_needs_review > 0) {
    steps.push(i18n.NEXT_REVIEW(counters.claims_needs_review));
  }
  if (counters.proposals_pending_disruptive > 0) {
    steps.push(i18n.NEXT_DECIDE_DISRUPTIVE(counters.proposals_pending_disruptive));
  } else if (counters.proposals_pending > 0) {
    steps.push(i18n.NEXT_DECIDE_PROPOSALS(counters.proposals_pending));
  }
  if (openOrBlocked > 0) {
    steps.push(i18n.NEXT_SETTLE(openOrBlocked));
  }
  if (counters.required_tasks_left > 0) {
    steps.push(i18n.NEXT_FINISH_TASKS(counters.required_tasks_left));
  }
  if (counters.tasks === 0) {
    steps.push(i18n.NEXT_APPLY_PROCEDURE);
  }
  if (steps.length === 0) {
    steps.push(i18n.NEXT_CLOSE);
  }
  return steps;
};

/** What the agent is doing now, from the latest agent activity. */
export const describeRunningNow = (
  record: InvestigationRecord,
  entries: readonly ActivityEntry[],
  now: number
): string => {
  if (!record.ai_enabled) {
    return i18n.RUNNING_NO_AGENTS;
  }
  const agentName = record.agent_name ?? i18n.THE_AGENT;
  if (record.status === 'closed') {
    return i18n.RUNNING_NOTHING_CLOSED;
  }
  const latest = entries.find(({ actor }) => actor.type === 'agent');
  if (latest && now - Date.parse(latest.ts) < AGENT_ACTIVE_WINDOW_MS) {
    return i18n.RUNNING_WORKING(agentName, latest.message);
  }
  return i18n.RUNNING_IDLE(agentName);
};
