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

const getEditRulesPromptContent = (applyChartRules: boolean): string =>
  [
    'EDIT RULES:',
    '- Return the complete updated configuration.',
    applyChartRules
      ? '- Reauthor the presentation. Apply every applicable chart rule below, replacing custom styling and colors the rules do not call for. Use the existing configuration for data, bindings, and thresholds only, not as a presentation template.'
      : '- Apply the requested changes and any adjustment they require, and preserve unrelated presentation settings. Keep ambiguous settings and report the ambiguity in the authoring note.',
    ...(applyChartRules
      ? [
          '- Derive every title, label, and description from the query alone, naming the measure and breakdown it computes. Existing display text is not a naming instruction. Do not keep, restyle, or recapitalize it unless the query or <user_query> proves it.',
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
  preserveESQL = false,
  applyChartRules = false,
  additionalContext,
}: {
  nlQuery: string;
  esqlQuery: string;
  chartType: SupportedChartType;
  schema: object;
  existingConfig?: string;
  parsedExistingConfig?: VisualizationConfig | null;
  preserveESQL?: boolean;
  applyChartRules?: boolean;
  additionalContext?: string;
}): BaseMessageLike[] => {
  const keepsExistingQueries = preserveESQL && Boolean(existingConfig);

  const segments = [
    `You are a Kibana Lens visualization configuration expert. Generate a valid configuration for a ${chartType} visualization based on the provided schema and ES|QL query.

Schema for ${chartType}:
<schema type="${chartType}">
${JSON.stringify(schema)}
</schema>`,
    existingConfig ? getEditRulesPromptContent(applyChartRules) : '',
    `DATA SOURCE RULES:
1. The ES|QL query is owned and injected by the system automatically. DO NOT output a 'data_source' field, and do not restate, copy, or modify the query anywhere in the config.
2. ${
      keepsExistingQueries
        ? 'This is an appearance-only edit. Each layer keeps its existing data_source, column bindings, order, and displayed measures from the existing configuration.'
        : 'Bind only result columns from the resolved ES|QL query supplied with the request.'
    }
3. For ES|QL column bindings use { column: '<esql column name>', ...other options }, and bind only columns produced by the layer's query.
4. Follow the schema definition strictly and never add properties it does not define. It intentionally omits 'data_source'; never add it.`,
    getChartTypeConfigPromptContent(chartType),
    getColorConfigPromptContent(chartType, parsedExistingConfig),
    `Return ONLY a JSON object wrapped in a markdown code block. The "authoring_note" must be one factual sentence describing what the final chart measures, its breakdown, and notable presentation choices. Do not include reasoning. The "config" must contain only the Lens configuration:
\`\`\`json
{
  "authoring_note": "One-sentence description of the authored chart",
  "config": { ... }
}
\`\`\``,
    additionalContext ?? '',
  ];

  return [
    ['system', segments.filter(Boolean).join('\n\n')],
    [
      'human',
      [
        existingConfig
          ? `Existing chart data and presentation:\n<existing_configuration>\n${existingConfig}\n</existing_configuration>`
          : '',
        keepsExistingQueries ? '' : `Resolved ES|QL query:\n${JSON.stringify(esqlQuery)}`,
        `<user_query>\n${nlQuery}\n</user_query>`,
        'Generate the visualization configuration for this request.',
      ]
        .filter(Boolean)
        .join('\n\n'),
    ],
  ];
};
