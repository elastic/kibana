/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VisualizationDatasetExample } from '../../../src/evaluate_dataset';
import type { RefusalReason } from '../../../src/evaluators/visualization_refusal';
import { withDataSource } from './factories';

/** A request the agent should decline or push back on instead of drawing. */
export const refusalExample = ({
  question,
  reason,
}: {
  question: string;
  reason: RefusalReason;
}): VisualizationDatasetExample => ({
  input: { question },
  metadata: { chartFamily: 'refusal', refusalReason: reason },
  output: { refusal: { reason } },
});

/**
 * Negative examples. The first one doubles as a canary: a chart drawn against
 * an index that does not exist can only score by accident, so a run where it
 * passes the positive evaluators means those evaluators have stopped
 * discriminating.
 */
export const VISUALIZATION_REFUSAL_EXAMPLES: VisualizationDatasetExample[] = withDataSource(
  'logs',
  [
    refusalExample({
      question:
        'Create a bar chart of request counts by response code in kibana_sample_data_missing.',
      reason: 'missing_index',
    }),
    refusalExample({
      question: 'Create a line chart of average customer_age over time in kibana_sample_data_logs.',
      reason: 'missing_field',
    }),
    refusalExample({
      question: 'Create a chart.',
      reason: 'ambiguous',
    }),
  ]
);
