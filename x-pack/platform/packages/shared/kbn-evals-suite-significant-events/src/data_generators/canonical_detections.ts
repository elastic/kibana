/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Detection } from '@kbn/streams-schema';

/**
 * Stable timestamp for canonical detections. Canonical scenarios must be deterministic, so we do
 * not use the wall clock — the investigator time-scopes its ES|QL from this value.
 */
const CANONICAL_TIMESTAMP = '2024-01-01T00:00:00.000Z';

/**
 * Builds a deterministic "canonical" detection batch from a terse per-rule declaration in a
 * scenario's `input.detections`. Mirrors {@link canonicalKIFeaturesFromExpectedGroundTruth}:
 * the dataset declares only the essential ground truth (rule name/uuid, optionally change type),
 * and this generator stamps the boilerplate (`detection_id`, `kind`, `processed`, `@timestamp`,
 * `stream_name`) so canonical investigator runs are decoupled from snapshot-extracted detections.
 *
 * A declared field always wins; only missing fields are defaulted.
 */
export const canonicalDetectionsFromGroundTruth = ({
  streamName,
  rules,
}: {
  streamName: string;
  rules: Array<Partial<Detection>>;
}): Detection[] =>
  rules.map((rule, index) => ({
    '@timestamp': rule['@timestamp'] ?? CANONICAL_TIMESTAMP,
    kind: rule.kind ?? 'detection',
    processed: rule.processed ?? false,
    detection_id: rule.detection_id ?? `${rule.rule_uuid ?? `rule-${index}`}-canonical-${index}`,
    rule_uuid: rule.rule_uuid ?? '',
    rule_name: rule.rule_name ?? '',
    stream_name: rule.stream_name ?? streamName,
    alert_count: rule.alert_count ?? 0,
    detection_evidence: rule.detection_evidence ?? { change_point_type: 'spike' },
    ...(rule.rules_activity ? { rules_activity: rule.rules_activity } : {}),
  }));
