/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Discovery, SignificantEvent } from '@kbn/significant-events-schema';

export interface ToSignificantEventSeedParams {
  /** A discovery the investigator produced in a prior cycle. */
  discovery: Partial<Discovery>;
  /** Unique event_id to stamp on the seed document. */
  eventId: string;
}

/**
 * Map a produced discovery into a `SignificantEvent` document suitable for indexing into
 * `.significant_events-events` between continuation cycles. The seeded doc has `status: "promoted"`
 * so the next cycle's `event_search state: "open"` call picks it up for continuation routing.
 */
export function toSignificantEventSeed({
  discovery,
  eventId,
}: ToSignificantEventSeedParams): SignificantEvent {
  const detections = discovery.detections ?? [];
  const ruleNames = [
    ...new Set(detections.map((d) => d.rule_name).filter((name): name is string => Boolean(name))),
  ];
  const streamNames = [
    ...new Set(
      detections.map((d) => d.stream_name).filter((name): name is string => Boolean(name))
    ),
  ];

  const now = new Date().toISOString();
  return {
    '@timestamp': now,
    created_at: now,
    event_id: eventId,
    discovery_id: discovery.discovery_id,
    discovery_slug: discovery.discovery_slug ?? eventId,
    status: 'promoted',
    rule_names: ruleNames,
    stream_names: streamNames.length > 0 ? streamNames : ['unknown'],
    title: discovery.title ?? 'eval-seeded-event',
    summary: discovery.summary ?? '',
    root_cause: discovery.root_cause ?? '',
    criticality: discovery.criticality ?? 50,
    confidence: discovery.confidence ?? 0.5,
    recommendations: [],
    cause_kis: discovery.cause_kis,
    dependency_edges: discovery.dependency_edges,
    infra_components: discovery.infra_components,
    evidences: discovery.evidences,
  };
}
