/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VisualizationDatasetExample } from '../../../src/evaluate_dataset';
import { ECOMMERCE_EXAMPLES } from './ecommerce';
import { VISUALIZATION_EDIT_EXAMPLES } from './edits';
import { HOST_METRICS_EXAMPLES } from './host_metrics';
import { LOGS_EXAMPLES } from './logs';
import { VISUALIZATION_REFUSAL_EXAMPLES } from './negatives';
import { VEGA_EXAMPLES } from './vega';

export { GOLDEN_TOOL_PATH } from './golden_tool_path';
export { VISUALIZATION_REFUSAL_EXAMPLES, VISUALIZATION_EDIT_EXAMPLES };

export const VISUALIZATION_CREATION_EXAMPLES: VisualizationDatasetExample[] = [
  ...LOGS_EXAMPLES,
  ...ECOMMERCE_EXAMPLES,
  ...HOST_METRICS_EXAMPLES,
  ...VEGA_EXAMPLES,
];
