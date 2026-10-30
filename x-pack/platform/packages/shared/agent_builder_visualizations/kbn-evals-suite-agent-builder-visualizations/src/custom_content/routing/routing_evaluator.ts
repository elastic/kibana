/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoutingEvaluator } from './types';

export const CUSTOM_CONTENT_ROUTING_EVALUATOR_NAME = 'Custom Content Routing';

/**
 * Scores the choice of renderer: custom content when the request needs an HTML layout, a chart
 * (Lens or Vega) when a chart can express it. Without the words "custom panel" in the prompt, the
 * agent has to make that choice itself.
 */
export const createRoutingEvaluator = (): RoutingEvaluator => ({
  name: CUSTOM_CONTENT_ROUTING_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const { renderers } = output;
    if (renderers.length === 0) {
      return {
        score: 0,
        label: 'no-panel',
        explanation: `The agent did not ask for a panel. Tools: ${
          output.toolIds.join(', ') || '(none)'
        }.`,
      };
    }

    const choseCustomContent = renderers.includes('custom_content');
    if (expected?.renderer === 'custom_content') {
      return choseCustomContent
        ? { score: 1, label: 'custom-content', explanation: 'The agent chose custom content.' }
        : {
            score: 0,
            label: 'chose-chart',
            explanation: `The request needs an HTML layout but the agent chose: ${renderers.join(
              ', '
            )}.`,
          };
    }

    return choseCustomContent
      ? {
          score: 0,
          label: 'chose-custom-content',
          explanation: 'A chart can express this request but the agent chose custom content.',
        }
      : {
          score: 1,
          label: 'chart',
          explanation: `The agent chose a chart: ${renderers.join(', ')}.`,
        };
  },
});
