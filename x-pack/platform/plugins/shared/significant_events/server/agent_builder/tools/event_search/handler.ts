/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEvent, SignificantEventStatus } from '@kbn/significant-events-schema';
import {
  DEFAULT_EVENTS_SEARCH_FROM,
  DEFAULT_EVENTS_SEARCH_TO,
  type EventClient,
} from '../../../lib/significant_events/events';

export const EVENT_SEARCH_DEFAULT_PER_PAGE = 20;
export const EVENT_SEARCH_MAX_PER_PAGE = 50;
export const EVENT_SEARCH_FULL_MAX_PER_PAGE = 10;

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
  confirmed?: boolean;
  description?: string;
  collected_at?: string;
}

export interface CompactEventSearchItem
  extends Omit<SignificantEvent, 'assessment_note' | 'investigations' | 'signals'> {
  signals: CompactEventSignal[];
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

const toCompactEvent = (event: SignificantEvent): CompactEventSearchItem => ({
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
  signals: (event.signals ?? []).map((signal) => ({
    stream_name: signal.stream_name,
    rule_uuid: signal.metadata.rule_uuid,
    rule_name: signal.metadata.rule_name,
    confirmed: signal.confirmed,
    description: signal.description,
    collected_at: signal.collected_at,
  })),
  causal_features: event.causal_features,
  blast_radius: event.blast_radius,
});

export async function searchEventsToolHandler({
  eventClient,
  params,
}: {
  eventClient: EventClient;
  params: EventSearchInput;
}): Promise<EventSearchResponse> {
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

  const envelope = {
    page: response.page,
    per_page: response.perPage,
    returned: response.hits.length,
    total: response.total,
    has_more: response.page * response.perPage < response.total,
    next_page: response.page * response.perPage < response.total ? response.page + 1 : null,
  };
  const events = params.exclude_unconfirmed_signals
    ? response.hits.map((event) => ({
        ...event,
        signals: (event.signals ?? []).filter((signal) => signal.confirmed !== false),
      }))
    : response.hits;

  return view === 'full'
    ? { ...envelope, view, events }
    : { ...envelope, view, events: events.map(toCompactEvent) };
}
