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
  const esqlQueryJson = JSON.stringify(esqlQuery);

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
1. The 'dataset' field must contain: { type: "esql", query: ${esqlQueryJson} }
2. For ES|QL column bindings use { column: '<esql column name>', ...other options }
3. All field names must match those available in the ES|QL query result
4. Follow the schema definition strictly

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
You are generating an ES|QL query for a Kibana Lens visualization. The query will be used to create a visualization in Kibana.

For that purpose, follow these guidelines:

## Time picker compatibility

Visualization ES|QL must respond to the Lens time picker. If a time field exists, use the event-time field, typically \`@timestamp\`, \`timestamp\`, or another event date. Reference \`?_tstart\` and \`?_tend\` in the query.
For time-series charts, pass \`?_tstart\` and \`?_tend\` to the bucket function.
For categorical, metric, or any other charts that do not group by time, add a filter such as \`WHERE <time field> >= ?_tstart AND <time field> < ?_tend\`.
Do not hardcode absolute times or now()-based ranges.

## Time Bucketing

### FROM

For time series charts, use auto buckets: \`BUCKET(<time field>, 75, ?_tstart, ?_tend)\` or \`TBUCKET(75, ?_tstart, ?_tend)\`, not hardcoded intervals like \`DATE_TRUNC(1 hour, <time field>)\`.
Omit \`LIMIT\`; the bucket range already bounds the results.

e.g. with for a normal index with FROM and BUCKET:

\`\`\`esql
FROM logs | STATS count = COUNT() BY bucket = BUCKET(timestamp, 75, ?_tstart, ?_tend)
\`\`\`

### TS

The visualization framework automatically adds the correct time range to the query for time series when using TS,
meaning you **do not need** to filter using TRANGE manually.

The only exception when you should use the variables to manually filter the timeframe with TS is for TBUCKET,

e.g.

\`\`\`esql
TS logs-tsds | STATS count = COUNT() BY bucket = TBUCKET(75, ?_tstart, ?_tend)
\`\`\`

Also omit \`LIMIT\` (same reasons as with FROM).`;
