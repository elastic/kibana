/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  createRuleDataBaseSchema,
  createActionPolicyDataSchema,
  alertEventSeveritySchema,
  ALERT_EPISODE_STATUS,
  PER_EPISODE_STRATEGIES,
  AGGREGATE_STRATEGIES,
  STRATEGIES_REQUIRING_INTERVAL,
} from '@kbn/alerting-v2-schemas';
import {
  ALERTING_V2_NOTIFICATION_GROUP_INPUT_DEFINITION_ID,
  builtinWorkflowInputDefinitions,
} from '@kbn/workflows';
import {
  ruleOperationSchema,
  setKindOperationSchema,
  setQueryOperationSchema,
  setStateTransitionOperationSchema,
} from '../tools/manage_rule/operations';
import {
  actionPolicyOperationSchema,
  setGroupingOperationSchema as setActionPolicyGroupingOperationSchema,
  setThrottleOperationSchema,
} from '../tools/manage_action_policy/operations';

const LARGE_ENUM_THRESHOLD = 20;

type JsonSchemaNode = Record<string, unknown>;

/**
 * Replaces large enum arrays with a compact description to keep token counts
 * manageable. Reuses the pattern from the workflows plugin
 * (`build_trigger_definitions_for_agent.ts`).
 */
function compactLargeEnums(node: unknown): unknown {
  if (node === null || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map(compactLargeEnums);

  const obj = node as JsonSchemaNode;
  const result: JsonSchemaNode = {};

  for (const [key, value] of Object.entries(obj)) {
    if (key === 'enum' && Array.isArray(value) && value.length > LARGE_ENUM_THRESHOLD) {
      const examples = value.slice(0, 5) as string[];
      result.type = 'string';
      result.description = [
        obj.description ?? '',
        `One of ${value.length} allowed values, e.g.: ${examples.join(', ')}`,
      ]
        .filter(Boolean)
        .join('. ');
    } else {
      result[key] = compactLargeEnums(value);
    }
  }

  return result;
}

export class SchemaTranslationError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'SchemaTranslationError';
  }
}

function zodToJsonSchema(schema: z.ZodType): unknown {
  try {
    const jsonSchema = z.toJSONSchema(schema, { target: 'draft-7', unrepresentable: 'any' });
    return compactLargeEnums(jsonSchema);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new SchemaTranslationError(`Failed to convert Zod schema to JSON Schema: ${message}`, e);
  }
}

interface FieldInfo {
  name: string;
  type: string;
  required: boolean;
  description: string;
  constraints: string;
}

/** Builds the parenthetical constraint text for a field-table Description cell. */
function formatFieldConstraintsSummary(prop: JsonSchemaNode): string {
  const parts: string[] = [];
  if (prop.minLength !== undefined) parts.push(`min length: ${prop.minLength}`);
  if (prop.maxLength !== undefined) parts.push(`max length: ${prop.maxLength}`);
  if (prop.minimum !== undefined) parts.push(`min: ${prop.minimum}`);
  if (prop.maximum !== undefined) parts.push(`max: ${prop.maximum}`);
  if (prop.pattern !== undefined) parts.push(`pattern: ${prop.pattern}`);
  if (prop.enum !== undefined && Array.isArray(prop.enum)) {
    parts.push(`enum: ${(prop.enum as string[]).join(' | ')}`);
  }
  if (prop.minItems !== undefined) parts.push(`min items: ${prop.minItems}`);
  if (prop.maxItems !== undefined) parts.push(`max items: ${prop.maxItems}`);
  if (prop.default !== undefined) parts.push(`default: ${JSON.stringify(prop.default)}`);
  return parts.join(', ');
}

/**
 * JSON Schema `type` may be a union array — nullable fields are emitted as
 * `['string', 'null']` rather than as an `anyOf`.
 */
function formatTypeKeyword(type: unknown): string {
  if (Array.isArray(type)) {
    return (type as string[]).join(' | ');
  }
  return (type as string) ?? 'unknown';
}

function resolveType(prop: JsonSchemaNode): string {
  if (prop.const !== undefined) {
    return `"${prop.const}"`;
  }
  if (prop.enum !== undefined && Array.isArray(prop.enum)) {
    return (prop.enum as string[]).map((v) => `"${v}"`).join(' | ');
  }
  if (prop.anyOf !== undefined && Array.isArray(prop.anyOf)) {
    return (prop.anyOf as JsonSchemaNode[]).map(resolveType).join(' | ');
  }
  if (prop.oneOf !== undefined && Array.isArray(prop.oneOf)) {
    return (prop.oneOf as JsonSchemaNode[])
      .map((variant) => {
        const disc = variant.properties as JsonSchemaNode | undefined;
        if (disc) {
          const firstKey = Object.keys(disc)[0];
          const firstProp = disc[firstKey] as JsonSchemaNode | undefined;
          if (firstProp?.const) return `{ ${firstKey}: "${firstProp.const}", ... }`;
        }
        return (variant.type as string) ?? 'variant';
      })
      .join(' | ');
  }
  const types = Array.isArray(prop.type) ? (prop.type as string[]) : [prop.type as string];
  if (types.includes('array')) {
    const items = prop.items as JsonSchemaNode | undefined;
    const itemType = items ? resolveType(items) : 'unknown';
    return [`${itemType}[]`, ...types.filter((t) => t !== 'array')].join(' | ');
  }
  return formatTypeKeyword(prop.type);
}

function jsonSchemaToFieldTable(jsonSchema: unknown): FieldInfo[] {
  if (!jsonSchema || typeof jsonSchema !== 'object') return [];
  const schema = jsonSchema as JsonSchemaNode;
  const properties = schema.properties as JsonSchemaNode | undefined;
  if (!properties) return [];
  const required = new Set((schema.required as string[]) ?? []);

  return Object.entries(properties).map(([name, rawProp]) => {
    const prop = rawProp as JsonSchemaNode;
    return {
      name,
      type: resolveType(prop),
      required: required.has(name),
      description: (prop.description as string) ?? '',
      constraints: formatFieldConstraintsSummary(prop),
    };
  });
}

/**
 * Type unions and enum lists contain `|`, which would otherwise split the cell into extra columns.
 * Backslashes are escaped first so a literal `\` before a pipe cannot consume the escape we add.
 */
function escapeTableCell(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
}

function formatFieldTable(fields: FieldInfo[]): string {
  if (fields.length === 0) return '';
  const rows = fields.map((f) => {
    const description = escapeTableCell(
      `${f.description}${f.constraints ? ` (${f.constraints})` : ''}`
    );
    return `| \`${f.name}\` | ${escapeTableCell(f.type)} | ${
      f.required ? 'required' : 'optional'
    } | ${description} |`;
  });
  return ['| Field | Type | Required | Description |', '|---|---|---|---|', ...rows].join('\n');
}

function formatVariantSchemas(jsonSchema: unknown): string {
  if (!jsonSchema || typeof jsonSchema !== 'object') return '';
  const schema = jsonSchema as JsonSchemaNode;
  const variants = (schema.oneOf ?? schema.anyOf) as JsonSchemaNode[] | undefined;
  if (!variants) return '';

  const sections: string[] = [];
  for (const variant of variants) {
    const props = variant.properties as JsonSchemaNode | undefined;
    if (!props) continue;

    const discriminatorKey = Object.keys(props).find((k) => {
      const p = props[k] as JsonSchemaNode;
      return p.const !== undefined || (p.enum && (p.enum as string[]).length === 1);
    });
    const discriminatorValue = discriminatorKey
      ? ((props[discriminatorKey] as JsonSchemaNode).const as string) ??
        ((props[discriminatorKey] as JsonSchemaNode).enum as string[])?.[0]
      : undefined;

    const label =
      discriminatorKey && discriminatorValue
        ? `\`${discriminatorKey}: "${discriminatorValue}"\``
        : variant.description ?? 'Variant';

    const fields = jsonSchemaToFieldTable(variant);
    if (fields.length > 0) {
      sections.push(`#### ${label}\n\n${formatFieldTable(fields)}`);
    }
  }
  return sections.join('\n\n');
}

const DEFAULT_API_SCHEMA_SOURCE =
  '`@kbn/alerting-v2-schemas`. This is the source of truth for field names, types, and constraints.';

/**
 * Generates markdown for a create/update API Zod schema (top-level field table,
 * plus optional extra sections such as query format variants).
 */
export const generateApiSchemaDoc = ({
  title,
  source = DEFAULT_API_SCHEMA_SOURCE,
  schema,
  extraSections,
}: {
  title: string;
  source?: string;
  schema: z.ZodType;
  extraSections?: (jsonSchema: unknown) => Array<{ heading: string; content: string }> | undefined;
}): string => {
  const jsonSchema = zodToJsonSchema(schema);
  const fieldTable = formatFieldTable(jsonSchemaToFieldTable(jsonSchema));

  const sections = [
    `# ${title}`,
    '',
    `Auto-generated from ${source}`,
    '',
    '## Top-Level Fields',
    '',
    fieldTable,
  ];

  for (const extra of extraSections?.(jsonSchema) ?? []) {
    if (extra.content) {
      sections.push('', `## ${extra.heading}`, '', extra.content);
    }
  }

  return sections.join('\n');
};

/**
 * Generates concise markdown documentation from the create-rule Zod schema.
 * Intended for embedding in the skill's `referencedContent`.
 */
export const generateRuleSchemaDoc = (): string =>
  generateApiSchemaDoc({
    title: 'Rule API Schema Reference',
    schema: createRuleDataBaseSchema,
    extraSections: (jsonSchema) => {
      const props = (jsonSchema as JsonSchemaNode).properties as JsonSchemaNode | undefined;
      if (!props?.query) {
        return undefined;
      }
      const queryVariants = formatVariantSchemas(props.query as JsonSchemaNode);
      return queryVariants ? [{ heading: 'Query Formats', content: queryVariants }] : undefined;
    },
  });

/**
 * Generates markdown for a discriminated-union tool operations schema
 * (e.g. `manage_rule` / `manage_action_policy`).
 */
export const generateOperationsDoc = ({
  title,
  source,
  schema,
}: {
  title: string;
  source: string;
  schema: z.ZodType;
}): string => {
  const variants = formatVariantSchemas(zodToJsonSchema(schema));

  return [`# ${title}`, '', `Auto-generated from ${source}.`, '', variants].join('\n');
};

/**
 * Generates concise markdown documentation for the manage_rule tool operations.
 */
export const generateRuleOperationsDoc = (): string =>
  generateOperationsDoc({
    title: 'Rule Operations Schema Reference',
    source: 'the `manage_rule` tool Zod schemas',
    schema: ruleOperationSchema,
  });

export const getSeverityValues = (): string[] => alertEventSeveritySchema.options;

export const getEpisodeStatusValues = (): string[] => Object.values(ALERT_EPISODE_STATUS);

const getNoDataStrategyValues = (): string[] =>
  setQueryOperationSchema.shape.no_data_strategy.unwrap().options;

const getRecoveryStrategyValues = (): string[] =>
  setQueryOperationSchema.shape.recovery_strategy.unwrap().options;

const getRuleKindValues = (): string[] => setKindOperationSchema.shape.kind.options;

const getGroupingModeValues = (): string[] =>
  setActionPolicyGroupingOperationSchema.shape.groupingMode.unwrap().options;

const getThrottleStrategyValues = (): string[] =>
  setThrottleOperationSchema.shape.strategy.unwrap().options;

/**
 * Builds a markdown table from a schema's values and a descriptions map. Throws
 * if the descriptions map is out of sync with the schema (missing or extra keys).
 */
const generateEnumTable = ({
  header,
  schemaValues,
  descriptions,
  schemaName,
}: {
  header: [string, string];
  schemaValues: readonly string[];
  descriptions: Record<string, string>;
  schemaName: string;
}): string => {
  const descKeys = new Set(Object.keys(descriptions));
  const schemaKeys = new Set(schemaValues);

  const missing = schemaValues.filter((v) => !descKeys.has(v));
  const extra = [...descKeys].filter((k) => !schemaKeys.has(k));

  if (missing.length > 0 || extra.length > 0) {
    const parts: string[] = [];
    if (missing.length > 0) parts.push(`missing descriptions for: ${missing.join(', ')}`);
    if (extra.length > 0) parts.push(`extra descriptions not in schema: ${extra.join(', ')}`);
    throw new SchemaTranslationError(
      `${schemaName} descriptions out of sync with schema — ${parts.join('; ')}`
    );
  }

  const rows = schemaValues.map((v) => `| \`${v}\` | ${descriptions[v]} |`);
  return [`| ${header[0]} | ${header[1]} |`, '|---|---|', ...rows].join('\n');
};

/**
 * Builds a markdown bullet list from a schema's values and a descriptions map.
 * Validates that descriptions cover all schema values exactly.
 */
const generateEnumList = ({
  schemaValues,
  descriptions,
  schemaName,
}: {
  schemaValues: readonly string[];
  descriptions: Record<string, string>;
  schemaName: string;
}): string => {
  const descKeys = new Set(Object.keys(descriptions));
  const schemaKeys = new Set(schemaValues);

  const missing = schemaValues.filter((v) => !descKeys.has(v));
  const extra = [...descKeys].filter((k) => !schemaKeys.has(k));

  if (missing.length > 0 || extra.length > 0) {
    const parts: string[] = [];
    if (missing.length > 0) parts.push(`missing descriptions for: ${missing.join(', ')}`);
    if (extra.length > 0) parts.push(`extra descriptions not in schema: ${extra.join(', ')}`);
    throw new SchemaTranslationError(
      `${schemaName} descriptions out of sync with schema — ${parts.join('; ')}`
    );
  }

  return schemaValues.map((v) => `- \`${v}\`: ${descriptions[v]}`).join('\n');
};

/** Formats enum values as an inline comma-separated backtick list. */
export const formatEnumValuesList = (values: readonly string[]): string =>
  values.map((v) => `\`${v}\``).join(', ');

/** Formats a set of strategy values as an inline backtick list. */
const formatStrategySet = (strategies: Set<string>): string =>
  formatEnumValuesList([...strategies]);

/**
 * Generates the Throttle / Grouping Compatibility section with heading and
 * strategy-set bullets, derived from the schema's strategy sets.
 */
export const generateThrottleGroupingCompatibilityDoc = (): string => {
  const groupingModes = getGroupingModeValues();
  const perEpisodeMode = groupingModes.find((m) => m === 'per_episode') ?? 'per_episode';
  const aggregateModes = groupingModes.filter((m) => m !== perEpisodeMode);

  const lines = [
    '### Throttle / Grouping Compatibility',
    '',
    'The throttle strategy must be compatible with the grouping mode:',
    `- For \`${perEpisodeMode}\`: ${formatStrategySet(PER_EPISODE_STRATEGIES)}.`,
    `- For ${aggregateModes.map((m) => `\`${m}\``).join(' / ')}: ${formatStrategySet(
      AGGREGATE_STRATEGIES
    )}.`,
    `- ${formatStrategySet(
      STRATEGIES_REQUIRING_INTERVAL
    )} require an \`interval\` (e.g. \`"5m"\`, \`"1h"\`).`,
  ];
  return lines.join('\n');
};

/** Returns the user-facing state transition field names from the operation schema (excludes internal operator fields and `operation`). */
const getStateTransitionFields = (): string[] =>
  Object.keys(setStateTransitionOperationSchema.shape).filter((k) => k !== 'operation');

/** Generates the Rule Kind section with heading, per-kind subsections, and immutability note. */
export const generateRuleKindDoc = (): string => {
  const kinds = getRuleKindValues();
  const episodeStatuses = formatEnumValuesList(getEpisodeStatusValues());
  const transitionFields = formatEnumValuesList(getStateTransitionFields());

  const kindDescriptions: Record<string, string[]> = {
    alert: [
      `### Alert (\`kind: ${kinds.find((k) => k === 'alert')}\`)`,
      `- **Stateful alerting** with full episode lifecycle: ${episodeStatuses}.`,
      `- Supports state transitions (${transitionFields}), recovery detection, and notification dispatch.`,
      "- Produces `type: 'alert'` events that participate in the dispatcher pipeline.",
      '- Use when the user wants to be **notified**, needs **lifecycle tracking**, or wants **recovery detection**.',
    ],
    signal: [
      `### Signal (\`kind: ${kinds.find((k) => k === 'signal')}\`)`,
      '- **Stateless detection** (observation-only).',
      "- Produces `type: 'signal'` events but **skips** episode lifecycle and dispatcher processing entirely.",
      '- No notifications, no recovery, no state transitions.',
      '- Use for logging or detection without automated action.',
    ],
  };

  const missing = kinds.filter((k) => !kindDescriptions[k]);
  if (missing.length > 0) {
    throw new SchemaTranslationError(
      `setKindOperationSchema descriptions out of sync — missing descriptions for: ${missing.join(
        ', '
      )}`
    );
  }

  return [
    '## Rule Kind: Alert vs Signal',
    '',
    'Rules declare a `kind` of `alert` or `signal`. This is the most important behavioral split in the system.',
    '',
    ...kinds.flatMap((k, i) => (i > 0 ? ['', ...kindDescriptions[k]] : kindDescriptions[k])),
    '',
    '### Immutability',
    '`kind` is **immutable on persisted rules** — it can only be set at creation time. The update API rejects changes to `kind`. For draft (in-memory) rules, `set_kind` can change it freely.',
  ].join('\n');
};

/** Generates the State Transition section with heading, field list from schema, and constraints. */
export const generateStateTransitionDoc = (): string => {
  const fields = getStateTransitionFields();
  const jsonSchema = zodToJsonSchema(setStateTransitionOperationSchema) as JsonSchemaNode;
  const properties = (jsonSchema.properties ?? {}) as JsonSchemaNode;

  const bullets = fields.map((f) => {
    const prop = properties[f] as JsonSchemaNode | undefined;
    const description = prop?.description as string | undefined;
    if (!description) {
      throw new SchemaTranslationError(
        `setStateTransitionOperationSchema field \`${f}\` is missing a .describe() — add one to the Zod schema`
      );
    }
    return `- \`${f}\` — ${description}`;
  });

  return [
    '## State Transition',
    '',
    'Use `set_state_transition` to delay alert firing until the threshold is breached N times in a row. This reduces noise from transient spikes.',
    '',
    ...bullets,
    '',
    'State transition is only allowed on `kind: alert` rules. Refer to the [rule-operations-schema reference](./references/rule-operations-schema.md) for the full field schema.',
  ].join('\n');
};

/** Generates the Episode Lifecycle section with heading, prose, and status table. */
export const generateEpisodeLifecycleDoc = (): string => {
  const table = generateEnumTable({
    header: ['Status', 'Meaning'],
    schemaValues: getEpisodeStatusValues(),
    descriptions: {
      inactive: 'Fully recovered',
      pending: 'Breached but below the consecutive-breaches threshold',
      active: 'Met the threshold — alert is firing',
      recovering: 'Breach stopped but not yet fully recovered',
    },
    schemaName: 'ALERT_EPISODE_STATUS',
  });

  return [
    '## Episode Lifecycle',
    '',
    'Episodes are the unit of alert state. Each unique group (by `group_hash`) has its own episode. Each episode has a status that reflects where it is in the lifecycle:',
    '',
    table,
    '',
    'Only `kind: alert` rules produce episodes. `kind: signal` rules write raw signal events with no episode tracking.',
  ].join('\n');
};

/** Generates the Alert Event Severity section with heading, valid values, and ES|QL patterns. */
export const generateSeverityDoc = (): string => {
  const values = formatEnumValuesList(getSeverityValues());

  return [
    '## Alert Event Severity',
    '',
    'Severity is a per-event property on alert events and episodes, not a rule-level field. It is extracted at execution time from a column named `severity` in the ES|QL breach query output.',
    '',
    `- **Valid values**: ${values} (case-insensitive).`,
    '- If the breach query does not produce a `severity` column, alert events have no severity.',
    '- Different groups can produce different severities in the same rule execution (the value comes from each row).',
    '- Action policies can match on `severity` to route high-severity episodes differently (e.g. PagerDuty for critical, email for low).',
    '',
    '### Setting Severity in ES|QL',
    '',
    'Severity is set by adding a `severity` column to the breach query via `EVAL`:',
    '',
    '- **Literal severity** — all alerts from the rule share the same severity:',
    '  `| EVAL severity = "critical"`',
    '- **Conditional severity** — severity varies per group based on data:',
    '  `| EVAL severity = CASE(cpu > 0.95, "critical", cpu > 0.8, "high", "medium")`',
  ].join('\n');
};

/** Generates the No-Data Strategy section with heading, prose, and value table. */
export const generateNoDataStrategyDoc = (): string => {
  const table = generateEnumTable({
    header: ['Value', 'Behaviour'],
    schemaValues: getNoDataStrategyValues(),
    descriptions: {
      last_known_status: 'Holds the last known episode status when no data is present.',
      emit: 'Emits a `no_data` alert event when no_data query returns no rows for the group. "emit" is not currently accepted by the create/update API.',
      recover: 'Forces recovery when no data is present.',
      none: 'No-data situations are ignored (default).',
    },
    schemaName: 'setQueryOperationSchema.no_data_strategy',
  });

  return [
    '## No-Data Strategy',
    '',
    '`no_data_strategy` is a **top-level rule field** that controls behaviour when no data is present.',
    '',
    table,
    '',
    "When setting `no_data_strategy` to anything other than `'none'`, add a `no_data` block to the standalone query:",
    "`no_data: { query: 'FROM heartbeat-* | STATS count = COUNT(*) BY host.name | WHERE count >= 1' }`. For composed query format, the `base` query is used as the data query.",
    '',
    'Signal rules cannot set `no_data_strategy`.',
    'Refer to the [rule-schema reference](./references/rule-schema.md) for allowed values and constraints.',
  ].join('\n');
};

/** Generates the Recovery Strategy section with heading, prose, and value list. */
export const generateRecoveryStrategyDoc = (): string => {
  const list = generateEnumList({
    schemaValues: getRecoveryStrategyValues(),
    descriptions: {
      no_breach: 'recovers groups that stop breaching (default).',
      query: 'uses a custom recovery query to detect recovery.',
      none: 'disables recovery entirely.',
    },
    schemaName: 'setQueryOperationSchema.recovery_strategy',
  });

  return [
    '## Recovery Strategy',
    '',
    '`recovery_strategy` is a **top-level rule field** (not inside the query). It controls how episodes transition from active to recovering/inactive. Signal rules (`kind: signal`) cannot set `recovery_strategy`.',
    '',
    list,
    '',
    `When using \`recovery_strategy: '${
      setQueryOperationSchema.shape.recovery_strategy.unwrap().enum.query
    }'\`, add a \`set_query\` operation that includes a \`recovery\` block alongside \`breach\`:`,
    "- **Composed**: `recovery: { segment: 'WHERE cpu < 0.5' }`",
    "- **Standalone**: `recovery: { query: 'FROM metrics-* | WHERE cpu < 0.5' }`",
    '',
    'Refer to the [rule-schema reference](./references/rule-schema.md) for allowed values and constraints.',
  ].join('\n');
};

/** Generates the Grouping Modes section with heading and bullet list. */
export const generateGroupingModesDoc = (): string => {
  const list = generateEnumList({
    schemaValues: getGroupingModeValues(),
    descriptions: {
      per_episode: 'one notification per alert episode lifecycle (default).',
      all: 'a single notification for all matching episodes.',
      per_field: 'group by specified `groupBy` fields.',
    },
    schemaName: 'setGroupingOperationSchema.groupingMode',
  });

  return ['### Grouping Modes', list].join('\n');
};

/** Generates the Throttle Strategies section with heading and bullet list. */
export const generateThrottleStrategiesDoc = (): string => {
  const list = generateEnumList({
    schemaValues: getThrottleStrategyValues(),
    descriptions: {
      on_status_change: 'notify only on episode status transitions (default for `per_episode`).',
      per_status_interval: 'notify on transitions and at regular intervals.',
      time_interval:
        'notify at regular intervals regardless of status (default for `all`/`per_field`).',
      every_time: 'notify on every evaluation cycle (high volume).',
    },
    schemaName: 'setThrottleOperationSchema.strategy',
  });

  return ['### Throttle Strategies', list].join('\n');
};

/**
 * Generates concise markdown documentation from the create-action-policy Zod schema.
 */
export const generateActionPolicySchemaDoc = (): string =>
  generateApiSchemaDoc({
    title: 'Action Policy API Schema Reference',
    schema: createActionPolicyDataSchema,
  });

/**
 * Generates concise markdown documentation for the manage_action_policy tool operations.
 */
export const generateActionPolicyOperationsDoc = (): string =>
  generateOperationsDoc({
    title: 'Action Policy Operations Schema Reference',
    source: 'the `manage_action_policy` tool Zod schemas',
    schema: actionPolicyOperationSchema,
  });

/**
 * Generates concise markdown documentation for the action-policy → workflow dispatch payload.
 * Sourced from the `alertingV2NotificationGroup` built-in workflow input definition, which
 * mirrors `ActionPolicyWorkflowPayload` / `AlertEpisode` in `server/lib/dispatcher/types.ts`.
 *
 * At workflow render time the dispatcher schedules with `{ payload }`, so Liquid templates
 * access these fields as `{{ inputs.payload.<field> }}`.
 */
export const generateActionPolicyWorkflowPayloadDoc = (): string => {
  const jsonSchema =
    builtinWorkflowInputDefinitions[ALERTING_V2_NOTIFICATION_GROUP_INPUT_DEFINITION_ID];
  if (!jsonSchema) {
    throw new SchemaTranslationError(
      `Missing built-in workflow input definition "${ALERTING_V2_NOTIFICATION_GROUP_INPUT_DEFINITION_ID}"`
    );
  }

  const topLevelFields = jsonSchemaToFieldTable(jsonSchema);
  const topLevelTable = formatFieldTable(topLevelFields);

  const properties = (jsonSchema as JsonSchemaNode).properties as JsonSchemaNode | undefined;
  const episodesProp = properties?.episodes as JsonSchemaNode | undefined;
  const episodeItems = episodesProp?.items as JsonSchemaNode | undefined;
  const episodeFields = episodeItems ? jsonSchemaToFieldTable(episodeItems) : [];
  const episodeTable = formatFieldTable(episodeFields);

  const sections = [
    '# Action Policy Workflow Dispatch Payload',
    '',
    'Access pattern: `{{ inputs.payload.<field> }}` (e.g. `{{ inputs.payload.policyId }}`,',
    '`{{ inputs.payload.episodes }}`). For episode fields use',
    '`{% for ep in inputs.payload.episodes %}{{ ep.<field> }}{% endfor %}`.',
    'Rule names: `{{ inputs.payload.rules[ep.rule_id].name }}`.',
    '',
    '## Top-Level Fields (`inputs.payload`)',
    '',
    topLevelTable,
  ];

  if (episodeTable) {
    sections.push('', '## Episode Fields (`inputs.payload.episodes[]`)', '', episodeTable);
  }

  return sections.join('\n');
};
