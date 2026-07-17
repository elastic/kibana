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
  /** Unique event_uuid to stamp on the seed document. */
  eventUuid: string;
}

/**
 * Map a produced discovery into a `SignificantEvent` document suitable for indexing into
 * `.significant_events-events` between continuation cycles. The seeded doc has `status: "open"`
 * so the next cycle's `event_search state: "open"` call picks it up for continuation routing.
 */
export function canonicalSignificantEventFromGroundTruth({
  discovery,
  eventUuid,
}: ToSignificantEventSeedParams): SignificantEvent {
  const signals = discovery.signals ?? [];
  const streamNames = [
    ...new Set(signals.map((s) => s.stream_name).filter((name): name is string => Boolean(name))),
  ];

  const now = new Date().toISOString();
  return {
    '@timestamp': now,
    event_uuid: eventUuid,
    discovery_id: discovery.discovery_id,
    event_id: discovery.event_id ?? eventUuid,
    status: 'open',
    severity: discovery.severity ?? '40-medium',
    stream_names: streamNames.length > 0 ? streamNames : ['unknown'],
    title: discovery.title ?? 'eval-seeded-event',
    symptom_hypothesis: discovery.symptom_hypothesis,
    summary: discovery.summary ?? '',
    confidence: discovery.confidence ?? 0.5,
    causal_features: discovery.causal_features,
    blast_radius: discovery.blast_radius,
    signals: discovery.signals,
  };
}
