/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEvent, SignificantEventStatus } from '@kbn/significant-events-schema';
import { MAX_SIGNAL_DESCRIPTION_LENGTH } from '@kbn/significant-events-schema';
import {
  DEFAULT_EVENTS_SEARCH_FROM,
  DEFAULT_EVENTS_SEARCH_TO,
  type EventClient,
} from '../../../lib/significant_events/events';

export const EVENT_SEARCH_DEFAULT_PER_PAGE = 20;
export const EVENT_SEARCH_MAX_PER_PAGE = 50;
export const EVENT_SEARCH_FULL_MAX_PER_PAGE = 10;
// Bounds one event's signal detail in compact view — a long-running episode can otherwise
// accumulate dozens of signals, each carrying a full narrative description, and blow up a
// caller's prompt budget regardless of how many events are on the page. Truncation is reported
// via `total_signals`/`signals_truncated` so callers know to re-query with view: 'full' and
// event_ids: [event_id] for the complete list.
export const MAX_COMPACT_EVENT_SIGNALS = 10;

export type EventSearchView = 'compact' | 'full';

export const normalizeEventSearchQuery = (query: string | undefined): string | undefined => {
  const normalizedQuery = query?.trim();
  return normalizedQuery === '' ? undefined : normalizedQuery;
};

export interface EventSearchInput {
  query?: string;
  page?: number;
  per_page?: number;
  stream_names?: string[];
  status?: SignificantEventStatus;
  rule_uuids?: string[];
  event_ids?: string[];
  topology_feature_ids?: string[];
  exclude_unconfirmed_signals?: boolean;
  from?: string;
  to?: string;
  view?: EventSearchView;
}

export interface CompactEventSignal {
  stream_name: string;
  rule_uuid?: string;
  rule_name?: string;
  detection_id?: string;
  change_point_type?: string;
  p_value?: number;
  confirmed?: boolean;
  description?: string;
  collected_at?: string;
  // The query last run to verify this signal, so callers can re-run a fresh current-state
  // check without a separate KI lookup. Absent when no query has ever been run for it.
  esql_query?: string;
}

export interface CompactEventSearchItem
  extends Omit<SignificantEvent, 'assessment_note' | 'investigations' | 'signals'> {
  signals: CompactEventSignal[];
  // Count of all signals on the event, before compact-view truncation.
  total_signals: number;
  // True when `signals` omits entries present on the full event; fetch the rest with
  // view: 'full' and event_ids: [event_id].
  signals_truncated: boolean;
}

interface EventSearchEnvelope {
  page: number;
  per_page: number;
  returned: number;
  total: number;
  has_more: boolean;
  next_page: number | null;
}

export type EventSearchResponse =
  | (EventSearchEnvelope & {
      view: 'compact';
      events: CompactEventSearchItem[];
    })
  | (EventSearchEnvelope & {
      view: 'full';
      events: SignificantEvent[];
    });

type Signal = NonNullable<SignificantEvent['signals']>[number];

// Most-recent first; confirmed only breaks ties between signals with the same `collected_at`.
const byRecencyThenConfirmed = (a: Signal, b: Signal): number => {
  const byRecency = (b.collected_at ?? '').localeCompare(a.collected_at ?? '');
  if (byRecency !== 0) return byRecency;
  return a.confirmed === b.confirmed ? 0 : a.confirmed ? -1 : 1;
};

const COMPACT_DESCRIPTION_SUFFIX = '… [truncated]';
const COMPACT_DESCRIPTION_CONTENT_LENGTH =
  MAX_SIGNAL_DESCRIPTION_LENGTH - COMPACT_DESCRIPTION_SUFFIX.length;

const truncateCompactDescription = (description: string | undefined): string | undefined =>
  description !== undefined && description.length > MAX_SIGNAL_DESCRIPTION_LENGTH
    ? `${description.slice(0, COMPACT_DESCRIPTION_CONTENT_LENGTH)}${COMPACT_DESCRIPTION_SUFFIX}`
    : description;

// A signal matching the caller's own `rule_uuids`/`stream_names` filter is what the caller
// explicitly asked for, so its whole group is kept ahead of the rest and can never be truncated
// away in its favor; each group is independently sorted by recency.
const selectCompactSignals = (
  signals: SignificantEvent['signals'],
  params: Pick<EventSearchInput, 'rule_uuids' | 'stream_names'>
): Signal[] => {
  const all = signals ?? [];
  if (all.length <= MAX_COMPACT_EVENT_SIGNALS) return all;

  const requestedRuleUuids = new Set(params.rule_uuids ?? []);
  const requestedStreamNames = new Set(params.stream_names ?? []);
  const isRequested = (signal: Signal): boolean =>
    (signal.metadata.rule_uuid !== undefined &&
      requestedRuleUuids.has(signal.metadata.rule_uuid)) ||
    requestedStreamNames.has(signal.stream_name);

  const requested: Signal[] = [];
  const rest: Signal[] = [];
  for (const signal of all) {
    (isRequested(signal) ? requested : rest).push(signal);
  }

  return [...requested.sort(byRecencyThenConfirmed), ...rest.sort(byRecencyThenConfirmed)].slice(
    0,
    MAX_COMPACT_EVENT_SIGNALS
  );
};

const toCompactEvent = (
  event: SignificantEvent,
  params: Pick<EventSearchInput, 'rule_uuids' | 'stream_names'>
): CompactEventSearchItem => {
  const allSignals = event.signals ?? [];
  const compactSignals = selectCompactSignals(allSignals, params);
  return {
    event_id: event.event_id,
    event_uuid: event.event_uuid,
    '@timestamp': event['@timestamp'],
    title: event.title,
    symptom_hypothesis: event.symptom_hypothesis,
    summary: event.summary,
    status: event.status,
    severity: event.severity,
    confidence: event.confidence,
    stream_names: event.stream_names,
    signals: compactSignals.map((signal) => ({
      stream_name: signal.stream_name,
      rule_uuid: signal.metadata.rule_uuid,
      rule_name: signal.metadata.rule_name,
      detection_id: signal.metadata.detection_id,
      change_point_type: signal.metadata.change_point_type,
      p_value: signal.metadata.p_value,
      confirmed: signal.confirmed,
      description: truncateCompactDescription(signal.description),
      collected_at: signal.collected_at,
      esql_query: signal.evidence?.esql_query,
    })),
    total_signals: allSignals.length,
    signals_truncated: compactSignals.length < allSignals.length,
    causal_features: event.causal_features,
    blast_radius: event.blast_radius,
  };
};

const hasRequestedRule = (event: SignificantEvent, ruleUuids: string[]) =>
  (event.signals ?? []).some(
    (signal) =>
      signal.metadata?.rule_uuid !== undefined && ruleUuids.includes(signal.metadata.rule_uuid)
  );

// The generic lets a call site passing `view: 'full'` (or omitting it, defaulting to 'compact')
// get back the matching response member, so callers don't need to narrow on `.view` themselves.
export async function searchEventsToolHandler<V extends EventSearchView = 'compact'>({
  eventClient,
  params,
}: {
  eventClient: EventClient;
  params: EventSearchInput & { view?: V };
}): Promise<Extract<EventSearchResponse, { view: V }>> {
  const view = params.view ?? 'compact';
  const requestedPerPage = params.per_page ?? EVENT_SEARCH_DEFAULT_PER_PAGE;
  const maxPerPage = view === 'full' ? EVENT_SEARCH_FULL_MAX_PER_PAGE : EVENT_SEARCH_MAX_PER_PAGE;
  const sharedParams = {
    page: params.page ?? 1,
    perPage: Math.min(requestedPerPage, maxPerPage),
    search: normalizeEventSearchQuery(params.query),
    stream: params.stream_names,
    from: params.from ?? DEFAULT_EVENTS_SEARCH_FROM,
    to: params.to ?? DEFAULT_EVENTS_SEARCH_TO,
  };

  const hasRuleFilter = (params.rule_uuids?.length ?? 0) > 0;
  const hasEventIdFilter = (params.event_ids?.length ?? 0) > 0;
  const hasTopologyFilter = (params.topology_feature_ids?.length ?? 0) > 0;
  const response =
    params.status !== undefined || hasRuleFilter || hasEventIdFilter || hasTopologyFilter
      ? await eventClient.findLatestByCurrentStatePaginated({
          ...sharedParams,
          status: params.status ? [params.status] : undefined,
          ruleUuids: params.rule_uuids,
          eventIds: params.event_ids,
          topologyFeatureIds: params.topology_feature_ids,
        })
      : await eventClient.findLatestPaginated(sharedParams);

  const eventsWithUnconfirmedSignalsExcluded = params.exclude_unconfirmed_signals
    ? response.hits.map((event) => {
        const confirmedSignals = (event.signals ?? []).filter(
          (signal) => signal.confirmed !== false
        );
        const preserveUnconfirmedRuleMatch =
          hasRuleFilter &&
          !hasTopologyFilter &&
          !hasEventIdFilter &&
          hasRequestedRule(event, params.rule_uuids ?? []);

        return {
          ...event,
          signals: preserveUnconfirmedRuleMatch
            ? (event.signals ?? []).filter(
                (signal) =>
                  signal.confirmed !== false ||
                  params.rule_uuids?.includes(signal.metadata?.rule_uuid ?? '')
              )
            : confirmedSignals,
        };
      })
    : response.hits;
  // Rule matching happens in the data query before excluded signals are removed. Preserve an
  // otherwise invisible requested rule match so an agent can reconcile that open episode to
  // closed after a current recovery check. All other unconfirmed signals remain excluded.
  const events =
    params.exclude_unconfirmed_signals && hasRuleFilter && !hasTopologyFilter && !hasEventIdFilter
      ? eventsWithUnconfirmedSignalsExcluded.filter((event) =>
          hasRequestedRule(event, params.rule_uuids ?? [])
        )
      : eventsWithUnconfirmedSignalsExcluded;
  const envelope = {
    page: response.page,
    per_page: response.perPage,
    returned: events.length,
    total: response.total,
    has_more: response.page * response.perPage < response.total,
    next_page: response.page * response.perPage < response.total ? response.page + 1 : null,
  };

  return view === 'full'
    ? ({ ...envelope, view, events } as Extract<EventSearchResponse, { view: V }>)
    : ({
        ...envelope,
        view,
        events: events.map((event) => toCompactEvent(event, params)),
      } as Extract<EventSearchResponse, { view: V }>);
}
