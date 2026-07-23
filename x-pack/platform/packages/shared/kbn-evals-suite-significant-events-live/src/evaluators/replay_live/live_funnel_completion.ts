/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeLiveEventOutcome } from './live_event_outcome';
import type { ReplayLiveEvaluator } from './types';

interface FunnelStage {
  name: string;
  passed: boolean;
  detail: string;
}

/**
 * CODE evaluator: count/status funnel for the live pipeline. There is no canonical rule catalog
 * in live mode, so stages check that each product step produced output at all; the LLM criteria
 * judge quality. Incident-dependent stages (signals, detections, discoveries) pass vacuously on
 * baseline scenarios — a quiet funnel is the correct baseline outcome.
 */
export const liveFunnelCompletionEvaluator: ReplayLiveEvaluator = {
  name: 'live_funnel_completion',
  kind: 'CODE',
  evaluate: ({ output, expected }) => {
    const expectsIncident = expected?.expect_open_event === true;
    const generatedQueries = output?.generatedQueries ?? [];
    const totalSignals = Object.values(output?.signalCountsByRule ?? {}).reduce(
      (sum, count) => sum + count,
      0
    );
    const detections = output?.detections ?? [];
    const discoveries = output?.discoveries ?? [];
    const eventOutcome = computeLiveEventOutcome(output, expected);

    const stages: FunnelStage[] = [
      {
        name: 'onboarding',
        passed: generatedQueries.length > 0,
        detail: `${generatedQueries.length} rule-backed quer(ies) generated`,
      },
      {
        name: 'signals',
        passed: !expectsIncident || totalSignals > 0,
        detail: `${totalSignals} signal(s) from real rule executions`,
      },
      {
        name: 'detections',
        passed: !expectsIncident || detections.length > 0,
        detail: `${detections.length} change-point detection(s)`,
      },
      {
        name: 'discoveries',
        passed: !expectsIncident || discoveries.length > 0,
        detail: `${discoveries.length} discover(ies) written by the agent`,
      },
      {
        name: 'events',
        passed: eventOutcome.passed,
        detail: eventOutcome.detail,
      },
    ];

    const passedCount = stages.filter((stage) => stage.passed).length;
    return Promise.resolve({
      score: passedCount / stages.length,
      explanation: `Live funnel ${passedCount}/${stages.length} stage(s) passed — ${stages
        .map((stage) => `${stage.name}: ${stage.passed ? 'pass' : 'FAIL'} (${stage.detail})`)
        .join('; ')}`,
    });
  },
};
