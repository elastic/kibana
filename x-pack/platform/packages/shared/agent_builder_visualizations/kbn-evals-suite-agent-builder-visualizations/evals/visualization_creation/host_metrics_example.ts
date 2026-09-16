/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VisualizationGoldConfig } from '../../src/evaluators/gold_visualization_config';
import { HOST_METRICS_INDEX } from '../../src/fixtures/host_load_metrics';

export const HOST_METRICS_QUESTION =
  'Show CPU load average metrics over time as a line chart. Include system.load.1 (1-minute), system.load.5 (5-minute), and system.load.15 (15-minute) as separate lines, bucketed by auto time interval.';

export const HOST_METRICS_QUERY = `FROM ${HOST_METRICS_INDEX}
| STATS \`1-Minute Load\` = AVG(\`system.load.1\`), \`5-Minute Load\` = AVG(\`system.load.5\`), \`15-Minute Load\` = AVG(\`system.load.15\`) BY \`Time Bucket\` = BUCKET(@timestamp, 75, ?_tstart, ?_tend)`;

export const HOST_METRICS_EXAMPLE = {
  input: {
    question: HOST_METRICS_QUESTION,
  },
  output: {
    config: {
      type: 'xy',
      layers: [
        {
          type: 'line',
          data_source: {
            type: 'esql',
            query: HOST_METRICS_QUERY,
          },
          x: { column: 'Time Bucket' },
          y: [
            { column: '1-Minute Load' },
            { column: '5-Minute Load' },
            { column: '15-Minute Load' },
          ],
        },
      ],
    } satisfies VisualizationGoldConfig,
    goldenToolPath: ['load_skill', 'platform.core.create_visualization'],
  },
};
