/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VisualizationDatasetExample } from '../../../src/evaluate_dataset';
import { GOLDEN_TOOL_PATH } from './golden_tool_path';

/** kibana_sample_data_logs: one example per core Lens chart type plus a multi-series line. */
export const LOGS_EXAMPLES: VisualizationDatasetExample[] = [
  {
    input: {
      question:
        'Create a bar chart of the number of requests by response code in kibana_sample_data_logs.',
    },
    output: {
      config: {
        type: 'xy',
        layers: [
          {
            type: ['bar', 'bar_horizontal'],
            data_source: {
              type: 'esql',
              query: `FROM kibana_sample_data_logs
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| STATS \`Request Count\` = COUNT(*) BY response.keyword
| SORT \`Request Count\` DESC
| LIMIT 10`,
            },
            x: { column: 'response.keyword' },
            y: [{ column: 'Request Count' }],
          },
        ],
      },
      goldenToolPath: GOLDEN_TOOL_PATH,
    },
  },
  {
    input: {
      question:
        'Create a single metric visualization showing the total number of requests in kibana_sample_data_logs.',
    },
    output: {
      config: {
        type: 'metric',
        data_source: {
          type: 'esql',
          query: `FROM kibana_sample_data_logs
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| STATS \`Total Requests\` = COUNT(*)`,
        },
        metrics: [{ column: 'Total Requests' }],
      },
      goldenToolPath: GOLDEN_TOOL_PATH,
    },
  },
  {
    input: {
      question:
        'Create a line chart of total bytes over time in kibana_sample_data_logs.',
    },
    output: {
      config: {
        type: 'xy',
        layers: [
          {
            type: 'line',
            data_source: {
              type: 'esql',
              query: `FROM kibana_sample_data_logs
| STATS \`Total Bytes\` = SUM(bytes) BY \`Time Bucket\` = BUCKET(@timestamp, 75, ?_tstart, ?_tend)`,
            },
            x: { column: 'Time Bucket' },
            y: [{ column: 'Total Bytes' }],
          },
        ],
      },
      goldenToolPath: GOLDEN_TOOL_PATH,
    },
  },
  {
    input: {
      question:
        'Create a pie chart of request counts by response code in kibana_sample_data_logs.',
    },
    output: {
      config: {
        type: 'pie',
        data_source: {
          type: 'esql',
          query: `FROM kibana_sample_data_logs
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| STATS \`Request Count\` = COUNT(*) BY response.keyword
| SORT \`Request Count\` DESC
| LIMIT 10`,
        },
        metrics: [{ column: 'Request Count' }],
        group_by: [{ column: 'response.keyword' }],
      },
      goldenToolPath: GOLDEN_TOOL_PATH,
    },
  },
  {
    input: {
      question:
        'Create a horizontal bar chart of the top operating systems by request count in kibana_sample_data_logs.',
    },
    output: {
      config: {
        type: 'xy',
        layers: [
          {
            type: 'bar_horizontal',
            data_source: {
              type: 'esql',
              query: `FROM kibana_sample_data_logs
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| STATS \`Request Count\` = COUNT(*) BY machine.os.keyword
| SORT \`Request Count\` DESC
| LIMIT 10`,
            },
            x: { column: 'machine.os.keyword' },
            y: [{ column: 'Request Count' }],
          },
        ],
      },
      goldenToolPath: GOLDEN_TOOL_PATH,
    },
  },
  {
    input: {
      question:
        'Create a tag cloud of file extensions by request count in kibana_sample_data_logs.',
    },
    output: {
      config: {
        type: 'tag_cloud',
        data_source: {
          type: 'esql',
          query: `FROM kibana_sample_data_logs
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| STATS \`Request Count\` = COUNT(*) BY extension.keyword
| SORT \`Request Count\` DESC
| LIMIT 10`,
        },
        metric: { column: 'Request Count' },
        tag_by: { column: 'extension.keyword' },
      },
      goldenToolPath: GOLDEN_TOOL_PATH,
    },
  },
  {
    input: {
      question:
        'Create a data table of the top 10 URLs by request count in kibana_sample_data_logs, including total bytes for each URL.',
    },
    output: {
      config: {
        type: 'data_table',
        data_source: {
          type: 'esql',
          query: `FROM kibana_sample_data_logs
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| STATS \`Request Count\` = COUNT(*), \`Total Bytes\` = SUM(bytes) BY url.keyword
| SORT \`Request Count\` DESC
| LIMIT 10`,
        },
        rows: [{ column: 'url.keyword' }],
        metrics: [{ column: 'Request Count' }, { column: 'Total Bytes' }],
      },
      goldenToolPath: GOLDEN_TOOL_PATH,
    },
  },
  {
    input: {
      question:
        'Create a heatmap of request counts by hour of day and response code in kibana_sample_data_logs.',
    },
    output: {
      config: {
        type: 'heatmap',
        data_source: {
          type: 'esql',
          query: `FROM kibana_sample_data_logs
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| EVAL hour = DATE_EXTRACT("HOUR_OF_DAY", @timestamp)
| STATS \`Request Count\` = COUNT(*) BY hour, response.keyword`,
        },
        x: { column: 'hour' },
        y: { column: 'response.keyword' },
        metric: { column: 'Request Count' },
      },
      goldenToolPath: GOLDEN_TOOL_PATH,
    },
  },
  {
    input: {
      question: 'Create a treemap of request counts by host in kibana_sample_data_logs.',
    },
    output: {
      config: {
        type: 'treemap',
        data_source: {
          type: 'esql',
          query: `FROM kibana_sample_data_logs
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| STATS \`Request Count\` = COUNT(*) BY host.keyword
| SORT \`Request Count\` DESC
| LIMIT 10`,
        },
        metrics: [{ column: 'Request Count' }],
        group_by: [{ column: 'host.keyword' }],
      },
      goldenToolPath: GOLDEN_TOOL_PATH,
    },
  },
  {
    input: {
      question: 'Show average bytes per request as a gauge for kibana_sample_data_logs.',
    },
    output: {
      config: {
        type: 'gauge',
        data_source: {
          type: 'esql',
          query: `FROM kibana_sample_data_logs
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| STATS \`Average Bytes\` = AVG(bytes)`,
        },
        metric: { column: 'Average Bytes' },
      },
      goldenToolPath: GOLDEN_TOOL_PATH,
    },
  },
  {
    input: {
      question:
        'Create a line chart of request count and average bytes over time in kibana_sample_data_logs as two series.',
    },
    output: {
      // Multi-series over time is valid as Lens xy or Vega; score ES|QL
      // equivalence rather than forcing a single renderer/chart_type.
      config: {
        data_source: {
          type: 'esql',
          query: `FROM kibana_sample_data_logs
| STATS \`Request Count\` = COUNT(*), \`Average Bytes\` = AVG(bytes) BY \`Time Bucket\` = BUCKET(@timestamp, 75, ?_tstart, ?_tend)`,
        },
      },
      goldenToolPath: GOLDEN_TOOL_PATH,
    },
  },
];
