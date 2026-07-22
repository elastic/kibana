/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { E2EEvaluator } from './types';

/**
 * CODE evaluator for the detection checkpoint: F1 over rule_uuids.
 *
 * - Recall: fraction of `expected_detection_rule_uuids` that produced at least one detection.
 * - Precision: fraction of detected rules that are expected or explicitly allowed
 *   (`allowed_detection_rule_uuids`, e.g. benign volume rules that may fire without penalty).
 *
 * Timing and change-point type are intentionally not matched — the synthetic signal series ends
 * at the replay boundary, so the observed type (spike vs step_change) is an artifact of window
 * placement while the per-rule firing decision is the meaningful signal.
 */
/**
 * Change-point outcomes that carry no detection signal: `stationary` means a flat alert rate
 * (the product's write gate normally excludes it) and `indeterminable` is what ES `change_point`
 * returns when the histogram has too few buckets (< ~22) — a scan that determined NOTHING must
 * not count as a successful detection, or a regression that shrinks the scan window would still
 * score a perfect F1.
 */
const NON_SIGNAL_CHANGE_POINT_TYPES = new Set(['stationary', 'indeterminable']);

export const detectionMatchEvaluator: E2EEvaluator = {
  name: 'detection_match',
  kind: 'CODE',
  evaluate: ({ output, expected }) => {
    const expectedRules = expected?.expected_detection_rule_uuids ?? [];
    const allowedRules = new Set([
      ...expectedRules,
      ...(expected?.allowed_detection_rule_uuids ?? []),
    ]);

    const signalDetections = (output?.detections ?? []).filter(
      (detection) => !NON_SIGNAL_CHANGE_POINT_TYPES.has(detection.change_point_type)
    );
    const detectedRules = [...new Set(signalDetections.map((d) => d.rule_uuid))];

    const detectedExpected = expectedRules.filter((rule) => detectedRules.includes(rule));
    const missingRules = expectedRules.filter((rule) => !detectedRules.includes(rule));
    const unexpectedRules = detectedRules.filter((rule) => !allowedRules.has(rule));

    const recall = expectedRules.length === 0 ? 1 : detectedExpected.length / expectedRules.length;
    const precision =
      detectedRules.length === 0
        ? 1
        : (detectedRules.length - unexpectedRules.length) / detectedRules.length;
    const score = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

    const details = [
      `recall ${recall.toFixed(2)} (${detectedExpected.length}/${
        expectedRules.length
      } expected rules detected)`,
      `precision ${precision.toFixed(2)} (${detectedRules.length} detected rule(s), ${
        unexpectedRules.length
      } outside the expected/allowed set)`,
      ...(missingRules.length > 0 ? [`missing: ${missingRules.join(', ')}`] : []),
      ...(unexpectedRules.length > 0 ? [`unexpected: ${unexpectedRules.join(', ')}`] : []),
    ];

    return Promise.resolve({
      score,
      explanation: `Detection checkpoint F1 ${score.toFixed(2)} — ${details.join('; ')}`,
    });
  },
};
