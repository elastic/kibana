/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessageLike } from '@langchain/core/messages';
import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { getChartTypeConfigPromptContent } from './chart_type_guidance';
import { getColorPalettesPromptContent } from './color_palettes';
import { getLensCommonConfigGuidance } from './config_guidance';

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
  const chartTypeConfigPromptContent = getChartTypeConfigPromptContent(chartType);
  const colorPalettesPromptContent = getColorPalettesPromptContent(chartType);
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

DATA SOURCE RULES:
1. The ES|QL query is owned and injected by the system automatically. DO NOT output a 'data_source' field, and do not restate, copy, or modify the query anywhere in the config.
2. The configuration is built around this query; its result columns are the only columns available to bind: ${esqlQueryJson}
3. For ES|QL column bindings use { column: '<esql column name>', ...other options }, and every bound column must be one produced by that query.
4. Follow the schema definition strictly, with the single exception that you must omit the 'data_source' field.

${getLensCommonConfigGuidance()}

${colorPalettesPromptContent ? `${colorPalettesPromptContent}\n` : ''}
${chartTypeConfigPromptContent ? `${chartTypeConfigPromptContent}` : ''}

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
