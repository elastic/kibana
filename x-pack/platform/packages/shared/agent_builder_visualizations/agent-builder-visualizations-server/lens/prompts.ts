/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessageLike } from '@langchain/core/messages';
import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { getChartTypeConfigPromptContent } from './chart_type_guidance';
import { getColorConfigPromptContent } from './color_palettes';
import type { VisualizationConfig } from './types';

const getEditRulesPromptContent = (appearanceOnly: boolean): string =>
  [
    'EDIT RULES:',
    '- Return the complete updated configuration. Apply the requested changes and any adjustment they require; leave every unrelated setting as it is, including titles, colors, formats, thresholds, goals, and legends the request does not mention.',
    '- The design guidance below describes preferences for new charts. Do not reapply it to settings the request does not mention.',
    '- If an instruction is ambiguous (for example an unknown duration unit), keep the existing setting and say so in the authoring note instead of guessing.',
    ...(appearanceOnly
      ? [
          '- This is an appearance-only edit: the query is unchanged, so keep every column binding exactly as in the existing configuration.',
        ]
      : []),
  ].join('\n');

export const createGenerateConfigPrompt = ({
  nlQuery,
  esqlQuery,
  chartType,
  schema,
  existingConfig,
  parsedExistingConfig,
  appearanceOnly = false,
  additionalContext,
}: {
  nlQuery: string;
  esqlQuery: string;
  chartType: SupportedChartType;
  schema: object;
  existingConfig?: string;
  parsedExistingConfig?: VisualizationConfig | null;
  appearanceOnly?: boolean;
  additionalContext?: string;
}): BaseMessageLike[] => {
  const esqlQueryJson = JSON.stringify(esqlQuery);

  const segments = [
    `You are a Kibana Lens visualization configuration expert. Generate a valid configuration for a ${chartType} visualization based on the provided schema and ES|QL query.

Schema for ${chartType}:
<schema type="${chartType}">
${JSON.stringify(schema)}
</schema>`,
    existingConfig
      ? `Existing configuration to modify:
<existing_configuration>
${existingConfig}
</existing_configuration>

${getEditRulesPromptContent(appearanceOnly)}`
      : '',
    `DATA SOURCE RULES:
1. The ES|QL query is owned and injected by the system automatically. DO NOT output a 'data_source' field, and do not restate, copy, or modify the query anywhere in the config.
2. The configuration is built around this query; its result columns are the only columns available to bind: ${esqlQueryJson}
3. For ES|QL column bindings use { column: '<esql column name>', ...other options }, and every bound column must be one produced by that query.
4. Follow the schema definition strictly, with the single exception that you must omit the 'data_source' field.`,
    getChartTypeConfigPromptContent(chartType),
    getColorConfigPromptContent(chartType, parsedExistingConfig),
    `Your task is to generate a ${chartType} visualization configuration based on the following information:

<user_query>
${nlQuery}
</user_query>

Generate the ${chartType} visualization configuration.

IMPORTANT: Return ONLY a JSON object wrapped in a markdown code block. The "authoring_note" must be one factual sentence describing the final chart and notable presentation choices, such as omitted titles or hidden legends. Do not include reasoning. The "config" must contain only the Lens configuration:
\`\`\`json
{
  "authoring_note": "One-sentence description of the authored chart",
  "config": {
    // your configuration here
  }
}
\`\`\``,
    additionalContext ?? '',
  ];

  return [
    ['system', segments.filter(Boolean).join('\n\n')],
    // Human message required for Bedrock to work properly
    ['human', 'Generate the visualization configuration.'],
  ];
};
