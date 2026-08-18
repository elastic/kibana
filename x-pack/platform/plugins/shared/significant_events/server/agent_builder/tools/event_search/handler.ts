/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_SIGNAL_DESCRIPTION_LENGTH,
  type SignificantEvent,
  type SignificantEventStatus,
} from '@kbn/significant-events-schema';
import {
  DEFAULT_EVENTS_SEARCH_FROM,
  DEFAULT_EVENTS_SEARCH_TO,
  type EventClient,
} from '../../../lib/significant_events/events';

export const EVENT_SEARCH_DEFAULT_PER_PAGE = 20;
export const EVENT_SEARCH_MAX_PER_PAGE = 50;
export const EVENT_SEARCH_SIGNAL_PAGE_SIZE = 10;

export const DESCRIPTION_TRUNCATION_SUFFIX = '… [truncated]';
export const DESCRIPTION_CONTENT_LENGTH =
  MAX_SIGNAL_DESCRIPTION_LENGTH - DESCRIPTION_TRUNCATION_SUFFIX.length;

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
  from?: string;
  to?: string;
  view?: EventSearchView;
  signals_page?: number;
  signals_per_page?: number;
}

type SignalSummary = {
  total: number;
} & Record<Signal['verdict'], number>;

interface DetailedEventSignal {
  stream_name: string;
  rule_uuid?: string;
  verdict: Signal['verdict'];
  description?: string;
  collected_at?: string;
}

export interface CompactEventSearchItem
  extends Pick<
    SignificantEvent,
    | '@timestamp'
    | 'blast_radius'
    | 'causal_features'
    | 'confidence'
    | 'event_id'
    | 'event_uuid'
    | 'severity'
    | 'status'
    | 'stream_names'
    | 'summary'
    | 'symptom_hypothesis'
    | 'title'
  > {
  signal_rule_uuids: string[];
  signal_counts: SignalSummary;
  unresolved_rule_uuids: string[];
}

interface DetailedEventSearchItem
  extends Pick<
    SignificantEvent,
    | '@timestamp'
    | 'confidence'
    | 'event_id'
    | 'event_uuid'
    | 'severity'
    | 'status'
    | 'stream_names'
    | 'symptom_hypothesis'
    | 'title'
  > {
  signals: DetailedEventSignal[];
  signals_page: number;
  signals_per_page: number;
  signals_total: number;
  signals_has_more: boolean;
}

interface EventSearchEnvelope {
  page: number;
  per_page: number;
  total: number;
  has_more: boolean;
}

export type EventSearchResponse =
  | (EventSearchEnvelope & {
      view: 'compact';
      events: CompactEventSearchItem[];
    })
  | (EventSearchEnvelope & {
      view: 'full';
      events: DetailedEventSearchItem[];
    });

type Signal = NonNullable<SignificantEvent['signals']>[number];

const preventsClosure = (signal: Signal): boolean =>
  signal.verdict === 'confirms' || signal.verdict === 'inconclusive';

const byClosureStatusThenRecency = (left: Signal, right: Signal): number => {
  const leftPreventsClosure = preventsClosure(left);
  const rightPreventsClosure = preventsClosure(right);

  if (leftPreventsClosure !== rightPreventsClosure) {
    return leftPreventsClosure ? -1 : 1;
  }
  return (right.collected_at ?? '').localeCompare(left.collected_at ?? '');
};

const getRuleUuid = (signal: Signal): string | undefined =>
  signal.type === 'detection' ? signal.metadata.rule_uuid : undefined;

const createSignalSummary = (): SignalSummary => ({
  total: 0,
  confirms: 0,
  refutes: 0,
  off_topic: 0,
  inconclusive: 0,
  not_checked: 0,
});

const collectSignalMetadata = (signals: Signal[]) =>
  signals.reduce(
    (metadata, signal) => {
      const ruleUuid = getRuleUuid(signal);
      if (ruleUuid !== undefined) {
        metadata.ruleUuids.add(ruleUuid);
        if (preventsClosure(signal)) {
          metadata.closureBlockingRuleUuids.add(ruleUuid);
        }
      }
      metadata.signalCounts.total++;
      metadata.signalCounts[signal.verdict]++;
      return metadata;
    },
    {
      ruleUuids: new Set<string>(),
      closureBlockingRuleUuids: new Set<string>(),
      signalCounts: createSignalSummary(),
    }
  );

const toEventSearchItemBase = (
  event: SignificantEvent
): Pick<
  SignificantEvent,
  | '@timestamp'
  | 'confidence'
  | 'event_id'
  | 'event_uuid'
  | 'severity'
  | 'status'
  | 'stream_names'
  | 'symptom_hypothesis'
  | 'title'
> => ({
  event_id: event.event_id,
  event_uuid: event.event_uuid,
  '@timestamp': event['@timestamp'],
  title: event.title,
  symptom_hypothesis: event.symptom_hypothesis,
  status: event.status,
  severity: event.severity,
  confidence: event.confidence,
  stream_names: event.stream_names,
});

const toCompactEvent = (event: SignificantEvent): CompactEventSearchItem => {
  const signals = event.signals ?? [];
  const { ruleUuids, closureBlockingRuleUuids, signalCounts } = collectSignalMetadata(signals);
  return {
    ...toEventSearchItemBase(event),
    summary: event.summary,
    signal_rule_uuids: [...ruleUuids].sort(),
    signal_counts: signalCounts,
    unresolved_rule_uuids: [...closureBlockingRuleUuids].sort(),
    causal_features: event.causal_features,
    blast_radius: event.blast_radius,
  };
};

const truncateSignalDescription = (description: string | undefined): string | undefined =>
  description !== undefined && description.length > MAX_SIGNAL_DESCRIPTION_LENGTH
    ? `${description.slice(0, DESCRIPTION_CONTENT_LENGTH)}${DESCRIPTION_TRUNCATION_SUFFIX}`
    : description;

const toDetailedEvent = (
  event: SignificantEvent,
  signalsPage: number,
  signalsPerPage: number
): DetailedEventSearchItem => {
  const signals = [...(event.signals ?? [])].sort(byClosureStatusThenRecency);
  const start = (signalsPage - 1) * signalsPerPage;
  const pageSignals = signals.slice(start, start + signalsPerPage);
  return {
    ...toEventSearchItemBase(event),
    signals: pageSignals.map((signal) => ({
      stream_name: signal.stream_name,
      rule_uuid: getRuleUuid(signal),
      verdict: signal.verdict,
      description: truncateSignalDescription(signal.description),
      collected_at: signal.collected_at,
    })),
    signals_page: signalsPage,
    signals_per_page: signalsPerPage,
    signals_total: signals.length,
    signals_has_more: start + pageSignals.length < signals.length,
  };
};

const buildSearchParams = (view: EventSearchView, params: EventSearchInput) => {
  const requestedPerPage = params.per_page ?? EVENT_SEARCH_DEFAULT_PER_PAGE;
  const maxPerPage = view === 'full' ? 1 : EVENT_SEARCH_MAX_PER_PAGE;

  return {
    page: view === 'full' ? 1 : params.page ?? 1,
    perPage: Math.min(requestedPerPage, maxPerPage),
    search: normalizeEventSearchQuery(params.query),
    stream: params.stream_names,
    from: params.from ?? DEFAULT_EVENTS_SEARCH_FROM,
    to: params.to ?? DEFAULT_EVENTS_SEARCH_TO,
  };
};

const hasEventSearchFilters = (params: EventSearchInput): boolean =>
  params.status !== undefined ||
  (params.rule_uuids?.length ?? 0) > 0 ||
  (params.event_ids?.length ?? 0) > 0 ||
  (params.topology_feature_ids?.length ?? 0) > 0;

const toEnvelope = (response: {
  page: number;
  perPage: number;
  total: number;
}): EventSearchEnvelope => ({
  page: response.page,
  per_page: response.perPage,
  total: response.total,
  has_more: response.page * response.perPage < response.total,
});

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
  if (view === 'full' && params.event_ids?.length !== 1) {
    throw new Error('Full event search requires exactly one event ID');
  }

  const sharedParams = buildSearchParams(view, params);
  const response = hasEventSearchFilters(params)
    ? await eventClient.findLatestByCurrentStatePaginated({
        ...sharedParams,
        status: params.status ? [params.status] : undefined,
        ruleUuids: params.rule_uuids,
        eventIds: params.event_ids,
        topologyFeatureIds: params.topology_feature_ids,
      })
    : await eventClient.findLatestPaginated(sharedParams);

  const envelope = toEnvelope(response);

  return view === 'full'
    ? ({
        ...envelope,
        view,
        events: response.hits.map((event) =>
          toDetailedEvent(
            event,
            params.signals_page ?? 1,
            params.signals_per_page ?? EVENT_SEARCH_SIGNAL_PAGE_SIZE
          )
        ),
      } as Extract<EventSearchResponse, { view: V }>)
    : ({
        ...envelope,
        view,
        events: response.hits.map(toCompactEvent),
      } as Extract<EventSearchResponse, { view: V }>);
}
