/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Discovery } from '@kbn/significant-events-schema';

const CANONICAL_TIMESTAMP = '2026-01-01T00:00:00.000Z';

const normalizeEventIdSegment = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const canonicalDiscoveryFromGroundTruth = ({
  streamName,
  scenarioId,
  discovery,
}: {
  streamName: string;
  scenarioId: string;
  discovery: Partial<Discovery>;
}): Discovery => {
  const signals = discovery.signals ?? [];
  const streamNames =
    discovery.stream_names ??
    Array.from(
      new Set([
        streamName,
        ...signals.map((s) => s.stream_name).filter((n): n is string => Boolean(n)),
      ])
    );

  return {
    '@timestamp': discovery['@timestamp'] ?? CANONICAL_TIMESTAMP,
    kind: discovery.kind ?? 'discovery',
    discovery_id: discovery.discovery_id ?? `${scenarioId}-canonical`,
    event_id: discovery.event_id ?? `${normalizeEventIdSegment(scenarioId)}__canonical`,
    stream_names: streamNames,
    symptom_hypothesis: discovery.symptom_hypothesis ?? '',
    title: discovery.title ?? '',
    summary: discovery.summary ?? '',
    severity: discovery.severity ?? '20-low',
    confidence: discovery.confidence ?? 0,
    processed: discovery.processed ?? false,
    // Strip `confirmed` from input signals — per Critical Rule #4 in the judge prompt,
    // input signals arrive without confirmed stamps; the judge stamps confirmed only
    // from its own execute_esql results.
    ...(discovery.signals
      ? {
          signals: discovery.signals.map(({ confirmed: _omitted, ...rest }) => rest),
        }
      : {}),
    ...(discovery.causal_features ? { causal_features: discovery.causal_features } : {}),
    ...(discovery.blast_radius ? { blast_radius: discovery.blast_radius } : {}),
  };
};
