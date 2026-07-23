/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeEventOutcome } from './event_outcome';
import type { ReplaySeededEvaluator } from './types';

interface FunnelStage {
  name: string;
  passed: boolean;
  detail: string;
}

/**
 * CODE evaluator producing a single funnel-completion score for dashboard tracking: the fraction
 * of pipeline stages (signals -> detections -> discoveries -> events) that produced their
 * expected output. Stages with nothing expected pass vacuously, so a healthy baseline that stays
 * quiet end to end scores 1.
 */
export const funnelCompletionEvaluator: ReplaySeededEvaluator = {
  name: 'funnel_completion',
  kind: 'CODE',
  evaluate: ({ output, expected }) => {
    const expectedRules = expected?.expected_detection_rule_uuids ?? [];
    const signalsByRule = output?.signalsByRule ?? {};
    const detectedRules = new Set((output?.detections ?? []).map((d) => d.rule_uuid));
    const discoveries = output?.discoveries ?? [];
    const expectsDiscoveries = (expected?.expected_discoveries?.length ?? 0) > 0;
    const eventOutcome = computeEventOutcome(output, expected);

    const missingSignalRules = expectedRules.filter((rule) => (signalsByRule[rule] ?? 0) === 0);
    const missingDetectionRules = expectedRules.filter((rule) => !detectedRules.has(rule));

    const stages: FunnelStage[] = [
      {
        name: 'signals',
        passed: missingSignalRules.length === 0,
        detail:
          missingSignalRules.length === 0
            ? `signals written for all ${expectedRules.length} expected rule(s)`
            : `no signals for: ${missingSignalRules.join(', ')}`,
      },
      {
        name: 'detections',
        passed: missingDetectionRules.length === 0,
        detail:
          missingDetectionRules.length === 0
            ? `detections produced for all ${expectedRules.length} expected rule(s)`
            : `no detections for: ${missingDetectionRules.join(', ')}`,
      },
      {
        name: 'discoveries',
        passed: !expectsDiscoveries || discoveries.length > 0,
        detail: expectsDiscoveries
          ? `${discoveries.length} discover${discoveries.length === 1 ? 'y' : 'ies'} written`
          : 'no discoveries expected',
      },
      {
        name: 'events',
        passed:
          eventOutcome.unsatisfiedEntries.length === 0 &&
          eventOutcome.unjustifiedOpenEvents.length === 0,
        detail: `event outcome recall ${eventOutcome.recall.toFixed(2)}, ${
          eventOutcome.unjustifiedOpenEvents.length
        } unjustified open event(s)`,
      },
    ];

    const passedCount = stages.filter((stage) => stage.passed).length;
    const score = passedCount / stages.length;

    return Promise.resolve({
      score,
      explanation: `Funnel ${passedCount}/${stages.length} stage(s) passed — ${stages
        .map((stage) => `${stage.name}: ${stage.passed ? 'pass' : 'FAIL'} (${stage.detail})`)
        .join('; ')}`,
    });
  },
};
