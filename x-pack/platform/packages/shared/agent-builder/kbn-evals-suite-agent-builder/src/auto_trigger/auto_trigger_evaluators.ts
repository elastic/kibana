/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { AutoTriggerExample } from '../../evals/auto_trigger/auto_trigger_dataset';
import type { AutoTriggerResult } from './auto_trigger_client';

type AutoTriggerEvaluator = Evaluator<AutoTriggerExample, AutoTriggerResult>;

const answer = (run: boolean) => (run ? 'responded' : 'stayed quiet');

/** Whether the agent ran exactly when it should have. */
export const respondedAsExpectedEvaluator: AutoTriggerEvaluator = {
  name: 'Responded as expected',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output: { ran, decision }, expected }) => {
    const shouldRespond = Boolean(expected?.shouldRespond);
    const passed = ran === shouldRespond;

    return {
      score: passed ? 1 : 0,
      label: passed ? 'PASS' : 'FAIL',
      explanation: `The agent ${answer(ran)}; it should have ${
        shouldRespond ? 'responded' : 'stayed quiet'
      } (should_respond ${decision?.probability ?? 'n/a'}).`,
      metadata: { ran, shouldRespond, decision },
    };
  },
};

/** How far the probability was from the threshold, toward the right answer: negative is wrong. */
export const marginEvaluator: AutoTriggerEvaluator = {
  name: 'Margin',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output: { decision }, expected }) => {
    if (decision?.probability === undefined || decision.threshold === undefined) {
      return { score: null, label: 'unavailable', explanation: 'No decision probability' };
    }

    const distance = decision.probability - decision.threshold;

    return {
      score: expected?.shouldRespond ? distance : -distance,
      explanation: `should_respond ${decision.probability} against a threshold of ${decision.threshold}`,
    };
  },
};

/** How long the decision took, from the `auto_trigger` span. */
export const decisionLatencyEvaluator: AutoTriggerEvaluator = {
  name: 'Decision latency (s)',
  kind: 'CODE',
  direction: 'minimize',
  evaluate: async ({ output: { decision } }) =>
    decision
      ? { score: decision.durationMs / 1000 }
      : { score: null, label: 'unavailable', explanation: 'No auto_trigger span' },
};

/** Whether a decision model answered, rather than the fallback of running the agent. */
export const decidedEvaluator: AutoTriggerEvaluator = {
  name: 'Decided',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output: { decision } }) => {
    const decided = decision?.status === 'decided';

    return {
      score: decided ? 1 : 0,
      label: decided
        ? `${decision?.provider}:${decision?.inferenceId}`
        : decision?.status ?? 'none',
      explanation: decided
        ? `Decided by [${decision?.provider}] with [${decision?.inferenceId}]`
        : `No decision (${decision?.status ?? 'no span'}), so the agent ran`,
    };
  },
};

export const autoTriggerEvaluators: AutoTriggerEvaluator[] = [
  respondedAsExpectedEvaluator,
  marginEvaluator,
  decisionLatencyEvaluator,
  decidedEvaluator,
];
