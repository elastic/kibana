/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VisualizationDatasetExample } from '../../../src/evaluate_dataset';
import { GOLDEN_TOOL_PATH } from './golden_tool_path';

/** Vega-Lite path: forms Lens does not express. */
export const VEGA_EXAMPLES: VisualizationDatasetExample[] = [
  // Vega path: request a form Lens does not express (scatter with size).
  // Prompt is unranked, so gold must not SORT before LIMIT. The kept rows are then
  // arbitrary, so ES|QL Result Equivalence skips this example.
  {
    input: {
      question:
        'Create a Vega-Lite scatter plot of average bytes vs request count by client IP in kibana_sample_data_logs, with point size encoding the number of unique URLs.',
    },
    metadata: { chartFamily: 'vega', dataSource: 'logs' },
    output: {
      renderer: 'vega',
      config: {
        data_source: {
          type: 'esql',
          query: `FROM kibana_sample_data_logs
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| STATS \`Average Bytes\` = AVG(bytes), \`Request Count\` = COUNT(*), \`Unique URLs\` = COUNT_DISTINCT(url.keyword) BY clientip
| LIMIT 100`,
        },
        spec: {
          mark: 'point',
          encoding: {
            x: { field: 'Average Bytes' },
            y: { field: 'Request Count' },
            size: { field: 'Unique URLs' },
          },
        },
      },
      goldenToolPath: GOLDEN_TOOL_PATH,
    },
  },
];
