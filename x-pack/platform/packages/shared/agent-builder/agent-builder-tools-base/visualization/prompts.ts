/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessageLike } from '@langchain/core/messages';
import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import type { CapabilitySchemaFragment } from './capabilities';
import { getChartTypeConfigPromptContent } from './chart_type_guidance';
import { getColorPalettesPromptContent } from './color_palettes';
import type { ChartConfigExample } from './examples/xy';

/** Full converted JSON schema — today's behavior and the last-retry safety net. */
export interface FullSchemaPromptContent {
  mode: 'full';
  schema: object;
}

/**
 * Escalation-ladder content for chart types with a capability manifest:
 * capability index + core schema + examples on every attempt, plus repair
 * fragments for capabilities implicated by previous validation errors.
 */
export interface CapabilitiesPromptContent {
  mode: 'capabilities';
  capabilityIndex: string;
  coreSchema: object;
  fragments: CapabilitySchemaFragment[];
  examples: ChartConfigExample[];
}

export type GenerateConfigSchemaContent = FullSchemaPromptContent | CapabilitiesPromptContent;

const omitDataSource = (value: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'data_source'));

/**
 * Removes the system-owned `data_source` fields (root-level and per-layer)
 * from an example config so the examples match the data source rules the
 * model is given.
 */
const stripDataSources = (config: Record<string, unknown>): Record<string, unknown> => {
  const stripped = omitDataSource(config);
  if (Array.isArray(stripped.layers)) {
    stripped.layers = stripped.layers.map((layer) =>
      layer !== null && typeof layer === 'object' && !Array.isArray(layer)
        ? omitDataSource(layer as Record<string, unknown>)
        : layer
    );
  }
  return stripped;
};

const renderFragment = (fragment: CapabilitySchemaFragment): string =>
  `<schema_fragment capability="${fragment.name}">
${fragment.blurb}
${JSON.stringify({ paths: fragment.subtrees, $defs: fragment.defs })}
</schema_fragment>`;

const renderExample = (example: ChartConfigExample): string =>
  `<example description="${example.description}">
${JSON.stringify(stripDataSources(example.config))}
</example>`;

const renderSchemaContent = (
  chartType: SupportedChartType,
  content: GenerateConfigSchemaContent
): string => {
  if (content.mode === 'full') {
    return `Schema for ${chartType}:
<schema type="${chartType}">
${JSON.stringify(content.schema)}
</schema>`;
  }

  const { capabilityIndex, coreSchema, fragments, examples } = content;
  const sections = [
    `The ${chartType} schema is provided in parts: a capability index (one line per feature), the core schema (always-relevant fields), and schema fragments carrying the exact shape of specific capabilities. Only configure a capability beyond the core schema when the request calls for it; when its fragment is not provided, prefer omitting optional fields over guessing their shape.`,
    `Capability index for ${chartType}:
<capability_index type="${chartType}">
${capabilityIndex}
</capability_index>`,
    `Core schema for ${chartType}:
<core_schema type="${chartType}">
${JSON.stringify(coreSchema)}
</core_schema>`,
    ...(fragments.length > 0
      ? [
          `Schema fragments for capabilities this request needs ('paths' keys locate each fragment in the config; '*' marks array items):
${fragments.map(renderFragment).join('\n')}`,
        ]
      : []),
    ...(examples.length > 0
      ? [
          `Examples of valid ${chartType} configurations (the system-owned 'data_source' fields are omitted, as they must be in your output):
${examples.map(renderExample).join('\n')}`,
        ]
      : []),
  ];
  return sections.join('\n\n');
};

/**
 * Builds the config-generation prompt with the byte-stable parts first
 * (role/instructions, then capability index + schema-or-fragments + examples
 * in the system message) and all variable parts last (esql query, existing
 * config, user query, previous-attempt errors in the human message), so
 * provider prompt caching can reuse the stable prefix across calls.
 */
export const createGenerateConfigPrompt = ({
  nlQuery,
  esqlQuery,
  chartType,
  schemaContent,
  existingConfig,
  additionalChartConfigInstructions,
  additionalContext,
}: {
  nlQuery: string;
  esqlQuery: string;
  chartType: SupportedChartType;
  schemaContent: GenerateConfigSchemaContent;
  existingConfig?: string;
  additionalChartConfigInstructions?: string;
  additionalContext?: string;
}): BaseMessageLike[] => {
  const chartTypeConfigPromptContent = getChartTypeConfigPromptContent(chartType);
  const colorPalettesPromptContent = getColorPalettesPromptContent(chartType);

  return [
    [
      'system',
      `You are a Kibana Lens visualization configuration expert. Generate a valid configuration for a ${chartType} visualization based on the provided schema and ES|QL query.

DATA SOURCE RULES:
1. The ES|QL query is owned and injected by the system automatically. DO NOT output a 'data_source' field, and do not restate, copy, or modify the query anywhere in the config.
2. The configuration is built around the ES|QL query provided in the user message; its result columns are the only columns available to bind.
3. For ES|QL column bindings use { column: '<esql column name>', ...other options }, and every bound column must be one produced by that query.
4. Follow the schema definition strictly, with the single exception that you must omit the 'data_source' field.

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

${colorPalettesPromptContent ? `${colorPalettesPromptContent}\n` : ''}
${chartTypeConfigPromptContent ? `${chartTypeConfigPromptContent}` : ''}

${additionalChartConfigInstructions ?? ''}

IMPORTANT: Return ONLY the JSON configuration wrapped in a markdown code block like this:
\`\`\`json
{
  // your configuration here
}
\`\`\`

${renderSchemaContent(chartType, schemaContent)}`,
    ],
    [
      'human',
      `The ES|QL query for this visualization:
<esql_query>
${esqlQuery}
</esql_query>

${
  existingConfig
    ? `Existing configuration to modify:
<existing_configuration>
${existingConfig}
</existing_configuration>

`
    : ''
}<user_query>
${nlQuery}
</user_query>

${
  additionalContext ? `${additionalContext}\n\n` : ''
}Generate the ${chartType} visualization configuration.`,
    ],
  ];
};

/**
 * Builds the prompt for the post-validation fulfillment check: given the user
 * request, the capability index, and the validated config, decide whether the
 * config satisfies the request and name what is missing. Byte-stable content
 * (instructions + capability index) goes in the system message; variable
 * content (config, user query) in the human message.
 */
export const createFulfillmentCheckPrompt = ({
  nlQuery,
  chartType,
  validatedConfig,
  capabilityIndex,
}: {
  nlQuery: string;
  chartType: SupportedChartType;
  validatedConfig: object;
  capabilityIndex: string;
}): BaseMessageLike[] => [
  [
    'system',
    `You review generated Kibana Lens ${chartType} visualization configurations. Given a user request and the generated configuration, decide whether the configuration satisfies the request.

The configuration already passed schema validation: judge only whether the features the user explicitly asked for are present, not structural validity.

Rules:
- Report satisfied: false only when the request explicitly asks for something the configuration does not contain.
- Do not report features the user did not ask for, and do not judge the ES|QL query in 'data_source' beyond checking that requested columns are bound.
- For each unmet item, use the capability name from the capability index below when one applies; otherwise use a short description of the missing ask.

Capability index for ${chartType}:
<capability_index type="${chartType}">
${capabilityIndex}
</capability_index>`,
  ],
  [
    'human',
    `Generated configuration:
<configuration>
${JSON.stringify(validatedConfig)}
</configuration>

<user_query>
${nlQuery}
</user_query>

Does this configuration satisfy the user request?`,
  ],
];

export interface MicroEditRepairContext {
  /** JSON of the rejected patch; absent when the response itself could not be parsed. */
  patchJson?: string;
  /** Parse or validation error produced by the rejected response. */
  error: string;
  /** Fragments of the capabilities implicated by the validation-error paths. */
  fragments: CapabilitySchemaFragment[];
}

/**
 * Builds the micro-edit prompt (edit path, decisions §5): a single small-model
 * call that classifies an edit instruction against the existing config and,
 * for presentation-only edits, expresses it as a JSON Merge Patch (RFC 7386).
 * Byte-stable content (instructions + kind-annotated capability index) goes in
 * the system message; variable content (existing config, edit instruction,
 * repair context) in the human message.
 */
export const createMicroEditPrompt = ({
  nlQuery,
  chartType,
  existingConfigJson,
  capabilityIndex,
  repair,
}: {
  nlQuery: string;
  chartType: SupportedChartType;
  existingConfigJson: string;
  /** Kind-annotated capability index (one \`name (kind) — blurb\` line per capability). */
  capabilityIndex: string;
  repair?: MicroEditRepairContext;
}): BaseMessageLike[] => {
  const repairSection = repair
    ? `Your previous response was rejected.
${
  repair.patchJson
    ? `Previous patch:
<previous_patch>
${repair.patchJson}
</previous_patch>
`
    : ''
}Error:
<error>
${repair.error}
</error>
${
  repair.fragments.length > 0
    ? `Schema fragments for the capabilities involved ('paths' keys locate each fragment in the config; '*' marks array items):
${repair.fragments.map(renderFragment).join('\n')}
`
    : ''
}Fix the patch so it validates against the schema, or respond with {"intent": "data"} if the edit cannot be expressed as a presentation patch.

`
    : '';

  return [
    [
      'system',
      `You classify edit requests for existing Kibana Lens ${chartType} visualization configurations, and express presentation-only edits as JSON merge patches.

Classification rules:
- The edit is a 'data' edit when it changes what data is fetched or how result columns are bound: queries, datasets/indices, fields/columns, breakdowns, filters, sampling — any capability marked (data) in the index below — or a change of chart type.
- The edit is a 'presentation' edit when it only changes how the data is rendered: capabilities marked (presentation), or core fields such as the title.

Respond with EXACTLY ONE JSON object wrapped in a markdown code block:
- For a data edit, or whenever you cannot express the edit as a safe patch:
\`\`\`json
{"intent": "data"}
\`\`\`
- For a presentation edit:
\`\`\`json
{"intent": "presentation", "patch": { ... }}
\`\`\`

JSON Merge Patch (RFC 7386) rules for 'patch':
- Mirror the existing configuration's structure and include ONLY the fields that change.
- Set a field to null to delete it.
- Arrays are always replaced wholesale: to change anything inside an array you must emit the complete new array. When that array carries data bindings (e.g. 'layers'), respond with {"intent": "data"} instead.
- NEVER include 'data_source' anywhere in the patch; the system owns the query.

Capability index for ${chartType} (each line: name (kind) — summary):
<capability_index type="${chartType}">
${capabilityIndex}
</capability_index>`,
    ],
    [
      'human',
      `Existing configuration:
<existing_configuration>
${existingConfigJson}
</existing_configuration>

<edit_instruction>
${nlQuery}
</edit_instruction>

${repairSection}Classify the edit and respond with the JSON object.`,
    ],
  ];
};

export const esqlAdditionalInstructions = `
You are generating an ES|QL query for a Kibana Lens visualization. The query will be used to create a visualization in Kibana.

For that purpose, follow these guidelines:

## Human-readable column aliases

Use human-readable column aliases in STATS/EVAL (e.g. \`Unique Visitors\` not \`unique_visitors\`). Wrap multi-word aliases in backticks.

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
