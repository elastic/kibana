/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessageLike } from '@langchain/core/messages';
import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { getChartTypeConfigPromptContent } from './chart_type_guidance';
import { colorDesignPromptContent, getColorConfigPromptContent } from './color_palettes';
import type { PresentationMode, VisualizationConfig } from './types';

const getEditRulesPromptContent = (
  appearanceOnly: boolean,
  presentationMode: PresentationMode
): string =>
  [
    'EDIT RULES:',
    '- Return the complete updated configuration.',
    ...(presentationMode === 'enhance'
      ? [
          '- Reauthor the presentation: apply ALL applicable chart design defaults below. Use the existing configuration as a reference for data, bindings, and thresholds, not as a presentation template.',
          '- Rewrite titles, labels, and descriptions to name what the queries measure. Existing display text is unverified, not a naming instruction. Business terminology requires query evidence or an explicit instruction in <user_query>.',
          '- Replace custom palettes and color overrides with chart defaults. Use catalog palettes for semantic coloring only where the chart guidance calls for it.',
          '- Evaluate existing visual thresholds against the measure, unit, and scale: keep meaningful boundaries, revise those justified by the evidence, and remove unsupported threshold coloring. Never invent business targets.',
          '- Before returning, check the resulting titles, axes, legends, fills, formats, colors, and thresholds against every applicable rule. Report unresolved ambiguity in the authoring note.',
        ]
      : [
          '- Apply the requested changes and any adjustment they require; preserve unrelated presentation settings, including titles, colors, formats, thresholds, goals, and legends.',
          '- Do not reapply design defaults to settings the request does not mention. Keep ambiguous settings and report the ambiguity in the authoring note.',
        ]),
    ...(appearanceOnly
      ? [
          '- This is an appearance-only edit: keep every layer, its order, column bindings, and displayed measures unchanged. Preserve filters and query-related settings.',
        ]
      : [
          '- Apply requested data changes using the resolved query below; update column bindings to its result columns. Preserve unrelated filters and query-related settings.',
        ]),
  ].join('\n');

export const createGenerateConfigPrompt = ({
  nlQuery,
  esqlQuery,
  chartType,
  schema,
  existingConfig,
  parsedExistingConfig,
  appearanceOnly = false,
  presentationMode = 'focused',
  additionalContext,
}: {
  nlQuery: string;
  esqlQuery: string;
  chartType: SupportedChartType;
  schema: object;
  existingConfig?: string;
  parsedExistingConfig?: VisualizationConfig | null;
  appearanceOnly?: boolean;
  presentationMode?: PresentationMode;
  additionalContext?: string;
}): BaseMessageLike[] => {
  const segments = [
    `You are a Kibana Lens visualization configuration expert. Generate a valid configuration for a ${chartType} visualization based on the provided schema and ES|QL query.

Schema for ${chartType}:
<schema type="${chartType}">
${JSON.stringify(schema)}
</schema>`,
    existingConfig ? getEditRulesPromptContent(appearanceOnly, presentationMode) : '',
    `DATA SOURCE RULES:
1. The ES|QL query is owned and injected by the system automatically. DO NOT output a 'data_source' field, and do not restate, copy, or modify the query anywhere in the config.
2. ${
      appearanceOnly && existingConfig
        ? 'Each layer keeps its own existing data_source and column bindings from the existing configuration.'
        : 'Bind only result columns from the resolved ES|QL query supplied with the request.'
    }
3. For ES|QL column bindings use { column: '<esql column name>', ...other options }, and bind only columns produced by the layer's query.
4. Follow the schema definition strictly, with the single exception that you must omit the 'data_source' field.`,
    getChartTypeConfigPromptContent(chartType),
    colorDesignPromptContent,
    getColorConfigPromptContent(chartType, parsedExistingConfig),
    `Return ONLY a JSON object wrapped in a markdown code block. The "authoring_note" must be one factual sentence describing what the final chart measures, its breakdown, and notable presentation choices. Do not include reasoning. The "config" must contain only the Lens configuration:
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
    [
      'human',
      [
        existingConfig
          ? `Existing chart data and presentation:\n<existing_configuration>\n${existingConfig}\n</existing_configuration>`
          : '',
        appearanceOnly && existingConfig
          ? ''
          : `Resolved ES|QL query:\n${JSON.stringify(esqlQuery)}`,
        `<user_query>\n${nlQuery}\n</user_query>`,
        existingConfig && presentationMode === 'enhance'
          ? 'Rebuild the presentation, including all display text, from the queries and chart defaults. Replace unsupported names with factual measure names. Follow the data source rules above.'
          : 'Generate the visualization configuration for this request.',
      ]
        .filter(Boolean)
        .join('\n\n'),
    ],
  ];
};
