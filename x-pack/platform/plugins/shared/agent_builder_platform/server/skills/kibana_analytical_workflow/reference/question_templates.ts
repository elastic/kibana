/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReferencedContent } from '@kbn/agent-builder-server/skills/type_definition';

export const questionTemplatesReference: ReferencedContent = {
  relativePath: './reference',
  name: 'question-templates',
  content: `# Analytical Question Templates

Each of the 5 universal question types below has an ES|QL shape template. Substitute the
selected field group's fields and the resolved index/data view. Always filter by the confirmed
time range on the Time field if one exists.

## 1. Volume/count — "How many X occurred, and how much Y?"

\`\`\`
FROM <index>
| WHERE @timestamp >= NOW() - INTERVAL <n> DAYS
| STATS count = COUNT(*) BY <primary_field>
| SORT count DESC
\`\`\`

## 2. Distribution — "What are the most/least common values of X?"

\`\`\`
FROM <index>
| WHERE @timestamp >= NOW() - INTERVAL <n> DAYS
| STATS count = COUNT(*) BY <categorical_field>
| SORT count DESC
| LIMIT 20
\`\`\`

## 3. Trend — "How does X change over time?"

\`\`\`
FROM <index>
| WHERE @timestamp >= NOW() - INTERVAL <n> DAYS
| STATS count = COUNT(*) BY BUCKET(@timestamp, <interval>), <optional_breakdown_field>
| SORT \`BUCKET(@timestamp, <interval>)\` ASC
\`\`\`

## 4. Comparison/correlation — "How does X compare to/correlate with Y?"

\`\`\`
FROM <index>
| WHERE @timestamp >= NOW() - INTERVAL <n> DAYS
| STATS metric_x = <agg>(<field_x>), metric_y = <agg>(<field_y>) BY <grouping_field>
| SORT metric_x DESC
\`\`\`

## 5. Anomaly/outlier — "Are there unusual values of X?"

\`\`\`
FROM <index>
| WHERE @timestamp >= NOW() - INTERVAL <n> DAYS
| STATS p50 = PERCENTILE(<numeric_field>, 50), p90 = PERCENTILE(<numeric_field>, 90), p99 = PERCENTILE(<numeric_field>, 99), max = MAX(<numeric_field>) BY <grouping_field>
\`\`\`

For each generated question, also give a Dev Tools alternative (raw Query DSL, or Query DSL with
a painless script) when the ES|QL shape can't easily express the aggregation the user asked for
(e.g. cardinality of nested paths, scripted metrics).

## Visualization mapping

- Volume/count -> metric or bar chart
- Distribution -> bar chart or pie/donut (only for <= 8 categories)
- Trend -> line or area chart, time on X axis
- Comparison/correlation -> multi-series line chart or scatter plot
- Anomaly/outlier -> line chart with percentile bands, or table sorted by the outlier metric`,
};
