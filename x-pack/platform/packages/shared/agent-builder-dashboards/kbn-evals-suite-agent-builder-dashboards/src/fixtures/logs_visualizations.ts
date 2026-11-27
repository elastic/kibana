/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VisualizationAttachment } from '../types';

const BYTES_BY_EXTENSION_ESQL = `FROM kibana_sample_data_logs
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| STATS \`Bytes\` = SUM(bytes) BY extension.keyword
| SORT \`Bytes\` DESC
| LIMIT 10`;

const VISITORS_BY_COUNTRY_ESQL = `FROM kibana_sample_data_logs
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| STATS \`Visitors\` = COUNT_DISTINCT(clientip) BY geo.src
| SORT \`Visitors\` DESC
| LIMIT 10`;

/**
 * Two Lens ES|QL charts over the sample logs, stored as the visualization
 * skill stores them, as if the agent had created them earlier in the conversation.
 */
export const LOGS_VISUALIZATIONS: readonly VisualizationAttachment[] = [
  {
    id: 'bytes-by-extension',
    data: {
      renderer: 'lens',
      query: 'bytes by file extension',
      chart_type: 'xy',
      esql: BYTES_BY_EXTENSION_ESQL,
      visualization: {
        type: 'xy',
        title: 'Bytes by file extension',
        layers: [
          {
            type: 'bar',
            data_source: { type: 'esql', query: BYTES_BY_EXTENSION_ESQL },
            x: { column: 'extension.keyword' },
            y: [{ column: 'Bytes' }],
          },
        ],
      },
    },
  },
  {
    id: 'visitors-by-country',
    data: {
      renderer: 'lens',
      query: 'unique visitors by source country',
      chart_type: 'data_table',
      esql: VISITORS_BY_COUNTRY_ESQL,
      visualization: {
        type: 'data_table',
        title: 'Unique visitors by source country',
        data_source: { type: 'esql', query: VISITORS_BY_COUNTRY_ESQL },
        metrics: [{ column: 'Visitors' }],
        rows: [{ column: 'geo.src' }],
      },
    },
  },
];
