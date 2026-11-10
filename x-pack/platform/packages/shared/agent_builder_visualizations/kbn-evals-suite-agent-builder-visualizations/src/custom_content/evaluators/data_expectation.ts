/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describeMissingPanel } from '../custom_content_output';
import type { CustomContentEvaluator } from '../types';

export const CUSTOM_CONTENT_DATA_EVALUATOR_NAME = 'Custom Content Data';

/** A static panel has no query, and a data panel has one. */
export const createDataExpectationEvaluator = (): CustomContentEvaluator => ({
  name: CUSTOM_CONTENT_DATA_EVALUATOR_NAME,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const panel = output.after;
    if (!panel) {
      return {
        score: 0,
        label: 'no-panel',
        explanation: describeMissingPanel(output),
      };
    }

    const hasQuery = Boolean(panel.esql);
    const expectsQuery = expected?.data === 'query';
    if (hasQuery === expectsQuery) {
      return {
        score: 1,
        label: expectsQuery ? 'query' : 'static',
        explanation: expectsQuery
          ? 'The panel has a query, as expected.'
          : 'The panel is static with no query, as expected.',
      };
    }

    return {
      score: 0,
      label: expectsQuery ? 'missing-query' : 'unexpected-query',
      explanation: expectsQuery
        ? 'The panel should show live data but has no query.'
        : `A static panel should have no query, but it has: ${panel.esql}`,
      metadata: { esql: panel.esql, followUpToolArgs: output.followUpToolArgs },
    };
  },
});
