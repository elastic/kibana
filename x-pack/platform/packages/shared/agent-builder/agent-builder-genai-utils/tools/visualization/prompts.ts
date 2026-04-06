/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessageLike } from '@langchain/core/messages';
import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';

export const createGenerateConfigPrompt = ({
  nlQuery,
  esqlQuery,
  chartType,
  schema,
  existingConfig,
  additionalChartConfigInstructions,
  additionalContext,
}: {
  nlQuery: string;
  esqlQuery: string;
  chartType: SupportedChartType;
  schema: object;
  existingConfig?: string;
  additionalChartConfigInstructions?: string;
  additionalContext?: string;
}): BaseMessageLike[] => {
  return [
    [
      'system',
      `You are a Kibana Lens visualization configuration expert. Generate a valid configuration for a ${chartType} visualization based on the provided schema and ES|QL query.

Schema for ${chartType}:
<schema type="${chartType}">
${JSON.stringify(schema)}
</schema>

${
  existingConfig
    ? `Existing configuration to modify:
  <existing_configuration>
  ${existingConfig}
  </existing_configuration>
  `
    : ''
}

DATASET RULES:
1. The 'dataset' field must contain: { type: "esql", query: "${esqlQuery}" }
2. Always use { operation: 'value', column: '<esql column name>', ...other options } for operations
3. All field names must match those available in the ES|QL query result
4. Follow the schema definition strictly

TITLE RULES:
- Omit the 'title' field when the chart already displays the information within itself (e.g. metric, gauge, tagcloud, waffle charts show their value and label directly).
- When a title is needed, make it self-explanatory and exhaustive so that axis titles become unnecessary.
- NEVER duplicate information across the chart title, axis titles, and metric labels.

NUMBER FORMAT RULES:
- Always apply a 'format' to columns when the data has a well-known unit:
  - CPU / utilization percentages → { type: "percent", decimals: 1, compact: true }
  - Bytes (disk, memory, network volume) → { type: "bytes", decimals: 1 }
  - Bits (network throughput) → { type: "bits", decimals: 1 }
  - Durations (response time, latency) → { type: "duration", from: "<source unit>", to: "" } where <source unit> matches the ES field unit (e.g. "ms", "s", "micros")
- When column names or the user query hint at a unit (e.g. "cpu", "percent", "bytes_in", "disk_used", "latency_ms"), infer the correct format even if the user did not explicitly ask for it.
- Do NOT apply a format when the metric is a plain count, rate, or when the unit is ambiguous.

${additionalChartConfigInstructions ?? ''}

Your task is to generate a ${chartType} visualization configuration based on the following information:

<user_query>
${nlQuery}
</user_query>

Generate the ${chartType} visualization configuration.

IMPORTANT: Return ONLY the JSON configuration wrapped in a markdown code block like this:
\`\`\`json
{
  // your configuration here
}
\`\`\`

${additionalContext ?? ''}`,
    ],
    // Human message required for Bedrock to work properly
    ['human', 'Generate the visualization configuration.'],
  ];
};

export const esqlAdditionalInstructions = `

## Human-readable column aliases

Use human-readable column aliases in STATS/EVAL (e.g. \`Unique Visitors\` not \`unique_visitors\`). Wrap multi-word aliases in backticks.

## Time Bucketing

For time series charts, use the \`BUCKET\` function to create "auto" buckets that automatically scale with the time range.
Always use \`BUCKET(@timestamp, 75, ?_tstart, ?_tend)\` instead of hardcoded intervals like
\`DATE_TRUNC(1 hour, @timestamp)\`:

FROM logs | STATS count = COUNT() BY bucket = BUCKET(@timestamp, 75, ?_tstart, ?_tend)

When generating or passing "esql" for time-based XY charts, prefer this pattern (adjust the aggregation and timestamp field as needed) so the chart responds correctly to the dashboard or lens time range.
`;
