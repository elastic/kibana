/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withChartClockTimesDated } from './chart_times';
import { sanitizeDataSource } from './data_source';
import { MAX_IMPACT_MAP_EVENTS } from './constants';
import type { InvestigationSubject } from '../subjects/subject';
import type { ImpactMapEvent } from './impact_map';

const MAX_EVENT_ID_LENGTH = 256;

/**
 * A stable id for an event that came without one: its kind, what it happened to and the minute it
 * happened. Two passes that describe the same event in other words still land on one id.
 */
export const impactMapEventId = ({
  kind,
  at,
  entity_id: entityId,
  relationship_id: relationshipId,
}: Pick<ImpactMapEvent, 'kind' | 'at' | 'entity_id' | 'relationship_id'>): string =>
  `${kind}:${entityId ?? relationshipId ?? 'investigation'}:${at.slice(0, 16)}`.slice(
    0,
    MAX_EVENT_ID_LENGTH
  );

/** An event as a writer sends it: the id is optional and derived when missing. */
export type ImpactMapEventInput = Omit<ImpactMapEvent, 'id'> & { id?: string };

export const withImpactMapEventId = (event: ImpactMapEventInput): ImpactMapEvent => ({
  ...event,
  id: event.id || impactMapEventId(event),
  ...(event.evidence ? { evidence: withChartClockTimesDated(event.evidence, event.at) } : {}),
  // The one place every write passes through, so no credential reaches the stored event.
  ...(event.data_source ? { data_source: sanitizeDataSource(event.data_source) } : {}),
});

const time = ({ at }: ImpactMapEvent): number => {
  const parsed = Date.parse(at);
  return Number.isNaN(parsed) ? 0 : parsed;
};

/** Events in the order they happened, oldest first. */
export const sortImpactMapEvents = (events: readonly ImpactMapEvent[]): ImpactMapEvent[] =>
  [...events].sort((a, b) => time(a) - time(b));

/**
 * Merges events by id: an incoming event replaces the stored one with the same id, new ones are
 * added, and the result is in time order. Past the limit the oldest are dropped, since the latest
 * events are the ones an on-call reader is acting on.
 */
export const mergeImpactMapEvents = (
  stored: readonly ImpactMapEvent[] = [],
  incoming: readonly ImpactMapEvent[] = []
): ImpactMapEvent[] => {
  const byId = new Map(stored.map((event) => [event.id, event]));
  incoming.forEach((event) => byId.set(event.id, event));
  return sortImpactMapEvents([...byId.values()]).slice(-MAX_IMPACT_MAP_EVENTS);
};

/**
 * The alerts an investigation was opened on, as timeline events. They are read, not stored with
 * the map, so an alert that arrives or changes shows up without the agent writing it. The id
 * starts with `alert:` so it never clashes with an event the agent recorded.
 */
export const alertSubjectsToImpactMapEvents = (
  subjects: readonly Pick<
    InvestigationSubject,
    'subjectType' | 'subjectId' | 'summary' | 'snapshot' | 'createdAt'
  >[]
): ImpactMapEvent[] =>
  subjects
    .filter(({ subjectType }) => subjectType === 'alert')
    .map(({ subjectId, summary, snapshot, createdAt }) => {
      const at = snapshot?.start || snapshot?.timestamp || createdAt;
      const title = snapshot?.rule_name ?? summary ?? subjectId;
      return {
        id: `alert:${subjectId}`.slice(0, MAX_EVENT_ID_LENGTH),
        kind: 'alert' as const,
        title,
        ...(snapshot?.reason && { description: `- ${snapshot.reason}` }),
        at,
        ...(snapshot?.url && /^https?:\/\//.test(snapshot.url)
          ? { links: [{ label: title, url: snapshot.url }] }
          : {}),
      };
    });
