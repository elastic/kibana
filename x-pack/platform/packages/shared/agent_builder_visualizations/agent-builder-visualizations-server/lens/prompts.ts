/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessageLike } from '@langchain/core/messages';
import type { EsqlEsqlColumnInfo } from '@elastic/elasticsearch/lib/api/types';
import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { getChartTypeConfigPromptContent } from './chart_type_guidance';
import { getColorConfigPromptContent } from './color_palettes';
import { getConfigExamples, type LensConfigExample } from './config_examples';
import { getSchemaSectionIndex, LOAD_SCHEMA_SECTIONS_TOOL_NAME } from './schema_sections';
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

const getSchemaSectionsPromptContent = (chartType: SupportedChartType, shownIn: string): string =>
  [
    'SCHEMA SECTIONS:',
    `Copy the shape of any setting that ${shownIn} show. Other settings live in these top-level config sections. \`field: a|b\` lists the values a field accepts, \`*\` marks a required field, and \`one of: (…) | (…)\` lists alternative shapes whose fields cannot be mixed:`,
    getSchemaSectionIndex(chartType),
    `Call \`${LOAD_SCHEMA_SECTIONS_TOOL_NAME}\` only when the request needs a setting whose shape you cannot see in ${shownIn} or in this list. Call it once with every section it needs, then write the configuration. You cannot call it a second time. Never invent a field or value. When the configuration cannot express part of the request, apply the closest supported setting.`,
  ].join('\n');

const NEW_CHART_EXAMPLES_GUIDANCE =
  'Replace every <placeholder> with a result column name or real text. Keep the settings the example shows unless a rule or the request says otherwise, and add only the settings the request needs.';

const FOCUSED_EDIT_EXAMPLES_GUIDANCE =
  'The existing configuration decides the presentation. Use the examples only for the shape of the settings the request changes, and replace every <placeholder> with a result column name or real text.';

const getExamplesPromptContent = (
  examples: readonly LensConfigExample[],
  guidance: string
): string =>
  [
    examples.length > 1
      ? 'HOUSE-STYLE EXAMPLES (follow the one that fits the request and the query result):'
      : 'HOUSE-STYLE EXAMPLE:',
    ...examples.map(
      ({ label, config }) => `${label}:\n\`\`\`json\n${JSON.stringify(config)}\n\`\`\``
    ),
    guidance,
  ].join('\n\n');

const formatResultColumns = (columns: readonly EsqlEsqlColumnInfo[]): string =>
  `Result columns: ${columns
    .map(({ name, type }) => `${JSON.stringify(name)} (${type})`)
    .join(', ')}`;

export const createGenerateConfigPrompt = ({
  nlQuery,
  esqlQuery,
  columns,
  chartType,
  existingConfig,
  parsedExistingConfig,
  preserveESQL = false,
  applyChartRules = false,
}: {
  nlQuery: string;
  esqlQuery: string;
  /** Result columns of the resolved query, when they could be collected. */
  columns?: readonly EsqlEsqlColumnInfo[];
  chartType: SupportedChartType;
  existingConfig?: string;
  parsedExistingConfig?: VisualizationConfig | null;
  preserveESQL?: boolean;
  applyChartRules?: boolean;
}): BaseMessageLike[] => {
  const keepsExistingQueries = preserveESQL && Boolean(existingConfig);
  // A focused edit keeps its presentation, so the examples only show the shape of the
  // settings it changes.
  const isFocusedEdit =
    Boolean(existingConfig) && !applyChartRules && parsedExistingConfig?.type === chartType;
  const shownIn = existingConfig ? 'the examples and the existing configuration' : 'the examples';

  const segments = [
    `You are a Kibana Lens visualization configuration expert. Generate a valid configuration for a ${chartType} visualization that binds the result columns of the provided ES|QL query.`,
    existingConfig ? getEditRulesPromptContent(applyChartRules) : '',
    `DATA SOURCE RULES:
1. The ES|QL query is owned and injected by the system automatically. DO NOT output a 'data_source' field, and do not restate, copy, or modify the query anywhere in the config.
2. ${
      keepsExistingQueries
        ? 'This is an appearance-only edit. Each layer keeps its existing data_source, column bindings, order, and displayed measures from the existing configuration.'
        : 'Bind only result columns from the resolved ES|QL query supplied with the request.'
    }
3. For ES|QL column bindings use { column: '<esql column name>', ...other options }, and bind only columns produced by the layer's query.`,
    getChartTypeConfigPromptContent(chartType),
    getColorConfigPromptContent(chartType, parsedExistingConfig),
    getExamplesPromptContent(
      getConfigExamples(chartType),
      isFocusedEdit ? FOCUSED_EDIT_EXAMPLES_GUIDANCE : NEW_CHART_EXAMPLES_GUIDANCE
    ),
    getSchemaSectionsPromptContent(chartType, shownIn),
    `Return ONLY a minified JSON object, with no line breaks or indentation, wrapped in a markdown code block. The "authoring_note" must be one factual sentence describing what the final chart measures, its breakdown, notable presentation choices, and any part of the request that could not be applied. Do not include reasoning. The "config" must contain only the Lens configuration:
\`\`\`json
{"authoring_note":"One-sentence description of the authored chart","config":{...}}
\`\`\``,
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
        columns?.length ? formatResultColumns(columns) : '',
        `<user_query>\n${nlQuery}\n</user_query>`,
        'Generate the visualization configuration for this request.',
      ]
        .filter(Boolean)
        .join('\n\n'),
    ],
  ];
};
