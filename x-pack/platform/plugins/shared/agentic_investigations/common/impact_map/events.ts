/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PROPOSAL_CATEGORY_TODO } from '@kbn/proposals-common';
import { withChartClockTimesDated } from './chart_times';
import { sanitizeDataSource } from './data_source';
import { MAX_IMPACT_MAP_EVENTS } from './constants';
import type { InvestigationSubject } from '../subjects/subject';
import type { InvestigationProposalSummary } from '../investigations/investigation';
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

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Puts the alerts an investigation was opened on against the entity they are about, when it can be
 * told: the one entity whose name the alert's title or reason says. An alert that names none, or
 * more than one that are not part of each other's names, is left with no entity. The alert subject
 * carries no entity of its own, so this is read from its words.
 */
export const attachEntitiesToAlerts = (
  events: readonly ImpactMapEvent[],
  entities: ReadonlyArray<{ id: string; label?: string }>
): ImpactMapEvent[] =>
  events.map((event) => {
    if (event.kind !== 'alert' || event.entity_id || event.relationship_id) {
      return event;
    }
    const text = `${event.title} ${event.description ?? ''}`.toLowerCase();
    const named = entities.filter(({ label }) => {
      const name = label?.trim().toLowerCase();
      return (
        Boolean(name) &&
        new RegExp(`(^|[^a-z0-9_.-])${escapeRegExp(name as string)}([^a-z0-9_.-]|$)`).test(text)
      );
    });
    // "checkout" and "checkout-service" both named: the longer is the one meant.
    const longest = [...named].sort((a, b) => (b.label?.length ?? 0) - (a.label?.length ?? 0))[0];
    const clear =
      longest &&
      named.every(({ label }) =>
        (longest.label ?? '').toLowerCase().includes((label ?? '').toLowerCase())
      );
    return clear ? { ...event, entity_id: longest.id } : event;
  });

/**
 * The to-dos a person marked as applied, as response events: what responders did, at the time
 * they marked it. Read, not stored, so "Mark as not applied" takes the event off the timeline.
 */
export const appliedProposalsToImpactMapEvents = (
  proposals: readonly Pick<
    InvestigationProposalSummary,
    'id' | 'title' | 'comment' | 'category' | 'decision' | 'decided_at'
  >[]
): ImpactMapEvent[] =>
  proposals
    .filter(
      ({ category, decision, decided_at: decidedAt }) =>
        category === PROPOSAL_CATEGORY_TODO && decision === 'approved' && Boolean(decidedAt)
    )
    .map(({ id, title, comment, decided_at: decidedAt }) => ({
      id: `proposal:${id}`.slice(0, MAX_EVENT_ID_LENGTH),
      kind: 'response' as const,
      title: `Applied: ${title}`,
      ...(comment.trim() && { description: `- ${comment.trim().replace(/\n+/g, ' ')}` }),
      at: decidedAt as string,
    }));

/**
 * Puts every customer impact at or after the first root cause. A cause comes before what it does to
 * customers, so an impact stamped earlier has an imprecise time (the start of the bucket a query
 * grouped by, or a pass that did not yet know the cause), and the cause's moment is the earliest it
 * can have been. The ids stay as recorded, so links to an event still work.
 */
export const placeCauseBeforeImpact = (events: ImpactMapEvent[]): ImpactMapEvent[] => {
  const causeTimes = events
    .filter(({ kind }) => kind === 'root_cause')
    .map(({ at }) => Date.parse(at))
    .filter((time) => !Number.isNaN(time));
  if (causeTimes.length === 0) {
    return events;
  }
  const cause = Math.min(...causeTimes);
  return events.map((event) => {
    const time = Date.parse(event.at);
    if (event.kind !== 'customer_impact' || Number.isNaN(time) || time >= cause) {
      return event;
    }
    const ends = event.ends_at ? Date.parse(event.ends_at) : NaN;
    return {
      ...event,
      at: new Date(cause).toISOString(),
      ...(!Number.isNaN(ends) && ends < cause ? { ends_at: new Date(cause).toISOString() } : {}),
    };
  });
};
