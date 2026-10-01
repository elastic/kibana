/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ACTION_POLICY_MANAGEMENT_SKILL_ID, RULE_KIND_LABELS } from '@kbn/alerting-v2-constants';
import {
  createRuleDataBaseSchema,
  createActionPolicyDataSchema,
  alertEventSeveritySchema,
  alertEpisodeStatusSchema,
  ruleKindSchema,
  recoverySchema,
  recoveryStrategy,
  noDataSchema,
  noDataStrategy,
  groupingModeSchema,
  throttleStrategySchema,
  MATCHER_CONTEXT_FIELDS,
  PER_EPISODE_STRATEGIES,
  AGGREGATE_STRATEGIES,
  STRATEGIES_REQUIRING_INTERVAL,
  POLICY_MATCHER_TAGS_MAX,
  POLICY_MATCHER_TAG_MAX_LENGTH,
  MAX_KQL_LENGTH,
} from '@kbn/alerting-v2-schemas';
import {
  ALERTING_V2_NOTIFICATION_GROUP_INPUT_DEFINITION_ID,
  builtinWorkflowInputDefinitions,
} from '@kbn/workflows';
import {
  ruleOperationSchema,
  setStateTransitionOperationSchema,
} from '../tools/manage_rule/operations';
import { actionPolicyOperationSchema } from '../tools/manage_action_policy/operations';

type JsonSchemaNode = Record<string, unknown>;

interface FieldInfo {
  name: string;
  type: string;
  required: boolean;
  description: string;
  constraints: string;
}

export interface DescribedEnumValue {
  value: string;
  description: string;
}

const LARGE_ENUM_THRESHOLD = 20;

export class SchemaTranslationError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'SchemaTranslationError';
  }
}

const throwIfNotZodUnion = (schema: z.ZodType, schemaName: string): z.ZodUnion => {
  if (!(schema instanceof z.ZodUnion)) {
    throw new SchemaTranslationError(
      `${schemaName} is not a union of described literals. Use z.union of z.literal(...).describe(...) on each value.`
    );
  }
  return schema;
};

const throwIfMissingDescribes = (missing: string[], subject: string, detail?: string): void => {
  if (missing.length === 0) {
    return;
  }
  const suffix = detail ? ` ${detail}` : '';
  throw new SchemaTranslationError(
    `Missing .describe() on ${subject}: ${missing.join(', ')}.${suffix}`
  );
};

const throwIfMissingOperationDescribes = (
  variants: JsonSchemaNode[] | undefined,
  title: string
): void => {
  const missing = (variants ?? [])
    .filter(
      (variant) =>
        typeof variant.description !== 'string' || variant.description.trim().length === 0
    )
    .map((variant) => {
      const operation = (variant.properties as JsonSchemaNode | undefined)?.operation as
        | JsonSchemaNode
        | undefined;
      const value = operation?.const ?? (operation?.enum as string[] | undefined)?.[0];
      return typeof value === 'string' ? value : '(unnamed variant)';
    });

  throwIfMissingDescribes(
    missing,
    'operation variant(s)',
    `Add a top-level .describe() explaining the user goal to each listed variant (${title}).`
  );
};

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

const REF_PREFIXES = ['#/definitions/', '#/$defs/'] as const;

/** Keys that carry schema composition rather than the field's own shape. */
const COMPOSITION_KEYS = new Set(['$ref', 'allOf', 'definitions', '$defs', '$schema']);

function resolveRef(ref: string, root: JsonSchemaNode): JsonSchemaNode | undefined {
  if (ref === '#') return root;
  const prefix = REF_PREFIXES.find((candidate) => ref.startsWith(candidate));
  if (!prefix) return undefined;
  const defs = (root.definitions ?? root.$defs) as JsonSchemaNode | undefined;
  const target = defs?.[decodeURIComponent(ref.slice(prefix.length))];
  return target && typeof target === 'object' ? (target as JsonSchemaNode) : undefined;
}

/** Merges a referenced schema with the referencing site's own keys; the referencing site wins. */
function mergeSchemaNodes(base: JsonSchemaNode, override: JsonSchemaNode): JsonSchemaNode {
  const merged: JsonSchemaNode = { ...base, ...override };

  const baseProperties = base.properties as JsonSchemaNode | undefined;
  const overrideProperties = override.properties as JsonSchemaNode | undefined;
  if (baseProperties || overrideProperties) {
    merged.properties = { ...baseProperties, ...overrideProperties };
  }

  const required = [
    ...((base.required as string[]) ?? []),
    ...((override.required as string[]) ?? []),
  ];
  if (required.length > 0) merged.required = [...new Set(required)];

  return merged;
}

/**
 * Expands `$ref` pointers back into the tree. Every schema carrying a
 * `.meta({ id })` is hoisted into `definitions` by `z.toJSONSchema`, and
 * draft-7 — which cannot combine `$ref` with sibling keys — wraps the pointer
 * in a single-member `allOf`. The renderers below read `type`, `enum` and
 * `properties` directly, so unresolved pointers would render as `unknown`.
 * `visiting` tracks the pointers on the current path to stop self-referencing
 * definitions from recursing forever.
 */
function inlineRefs(node: unknown, root: JsonSchemaNode, visiting: ReadonlySet<string>): unknown {
  if (Array.isArray(node)) return node.map((item) => inlineRefs(item, root, visiting));
  if (node === null || typeof node !== 'object') return node;

  const obj = node as JsonSchemaNode;
  const own: JsonSchemaNode = {};
  for (const [key, value] of Object.entries(obj)) {
    if (COMPOSITION_KEYS.has(key)) continue;
    own[key] = inlineRefs(value, root, visiting);
  }

  const bases: JsonSchemaNode[] = [];
  const { $ref: ref, allOf } = obj;
  if (typeof ref === 'string' && !visiting.has(ref)) {
    const target = resolveRef(ref, root);
    if (target) {
      const nested = new Set(visiting).add(ref);
      bases.push(inlineRefs(target, root, nested) as JsonSchemaNode);
    }
  }
  if (Array.isArray(allOf)) {
    for (const member of allOf) {
      bases.push(inlineRefs(member, root, visiting) as JsonSchemaNode);
    }
  }

  return [...bases, own].reduce(mergeSchemaNodes, {});
}

function zodToJsonSchema(schema: z.ZodType): unknown {
  try {
    const jsonSchema = z.toJSONSchema(schema, {
      target: 'draft-7',
      unrepresentable: 'any',
    }) as JsonSchemaNode;
    return compactLargeEnums(inlineRefs(jsonSchema, jsonSchema, new Set()));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new SchemaTranslationError(
      `Failed to convert Zod schema to JSON Schema: ${message}. Check the Zod schema passed to skill-doc generation.`,
      e
    );
  }
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
    const variants = prop.oneOf as JsonSchemaNode[];
    if (variants.every((variant) => variant.const !== undefined)) {
      return variants.map(resolveType).join(' | ');
    }
    return variants
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

/**
 * Renders an object's field table followed by one table per nested object
 * property, so fields a single table would flatten to `object` — `pending.count`,
 * `query.base` — stay visible to the agent.
 */
function formatObjectTables(node: JsonSchemaNode, nestedHeading: string): string {
  const fields = jsonSchemaToFieldTable(node);
  if (fields.length === 0) return '';

  const properties = (node.properties ?? {}) as JsonSchemaNode;
  const nestedTables = fields.flatMap(({ name }) => {
    const child = properties[name] as JsonSchemaNode | undefined;
    if (child?.type !== 'object') return [];
    const childFields = jsonSchemaToFieldTable(child);
    return childFields.length > 0
      ? [`${nestedHeading} \`${name}\`\n\n${formatFieldTable(childFields)}`]
      : [];
  });

  return [formatFieldTable(fields), ...nestedTables].join('\n\n');
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

    const tables = formatObjectTables(variant, '#####');
    if (tables) {
      const description =
        typeof variant.description === 'string' && variant.description.trim().length > 0
          ? `${variant.description}\n\n`
          : '';
      sections.push(`#### ${label}\n\n${description}${tables}`);
    }
  }
  return sections.join('\n\n');
}

const toOperationJsonSchema = (schema: z.ZodType, title: string): JsonSchemaNode => {
  const jsonSchema = zodToJsonSchema(schema) as JsonSchemaNode;
  throwIfMissingOperationDescribes(
    (jsonSchema.oneOf ?? jsonSchema.anyOf) as JsonSchemaNode[] | undefined,
    title
  );
  return jsonSchema;
};

/**
 * Generates markdown for a create/update API Zod schema (top-level field table,
 * plus optional extra sections such as query format variants).
 */
export const generateApiSchemaDoc = ({
  title,
  schema,
  extraSections,
}: {
  title: string;
  schema: z.ZodType;
  extraSections?: (jsonSchema: unknown) => Array<{ heading: string; content: string }> | undefined;
}): string => {
  const jsonSchema = zodToJsonSchema(schema);
  const fieldTable = formatFieldTable(jsonSchemaToFieldTable(jsonSchema));

  const sections = [`# ${title}`, '', '## Top-Level Fields', '', fieldTable];

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
      if (!props) {
        return undefined;
      }
      return [
        {
          heading: 'Query',
          content: formatObjectTables(props.query as JsonSchemaNode, '####'),
        },
        {
          heading: 'Recovery Strategies',
          content: formatVariantSchemas(props.recovery as JsonSchemaNode),
        },
        {
          heading: 'No-Data Strategies',
          content: formatVariantSchemas(props.no_data as JsonSchemaNode),
        },
      ];
    },
  });

/**
 * Generates markdown for a discriminated-union tool operations schema
 * (e.g. `manage_rule` / `manage_action_policy`).
 */
export const generateOperationsDoc = ({
  title,
  schema,
}: {
  title: string;
  schema: z.ZodType;
}): string => {
  const jsonSchema = toOperationJsonSchema(schema, title);
  return [`# ${title}`, '', formatVariantSchemas(jsonSchema)].join('\n');
};

/**
 * Bullet list of each operation's top-level `.describe()`. Use this in a tool
 * description so usage copy stays in sync with the Zod schema instead of a
 * hand-written operations list.
 */
export const generateOperationsUsageList = ({
  title,
  schema,
}: {
  title: string;
  schema: z.ZodType;
}): string => {
  const jsonSchema = toOperationJsonSchema(schema, title);
  const variants = (jsonSchema.oneOf ?? jsonSchema.anyOf) as JsonSchemaNode[];
  return variants.map((variant) => `- ${variant.description}`).join('\n');
};

/**
 * Generates concise markdown documentation for the manage_rule tool operations.
 */
export const generateRuleOperationsDoc = (): string =>
  generateOperationsDoc({
    title: 'Rule Operations Schema Reference',
    schema: ruleOperationSchema,
  });

/** Operation `.describe()` list for the `manage_rule` tool description. */
export const generateRuleOperationsUsageList = (): string =>
  generateOperationsUsageList({
    title: 'Rule Operations Schema Reference',
    schema: ruleOperationSchema,
  });

export const getSeverityValues = (): string[] => alertEventSeveritySchema.options;

/**
 * Reads per-value `.describe()` copy from a Zod union of literals.
 * Throws if a value has no description. Callers catch this during skill
 * registration and log rather than aborting Kibana start.
 */
export const getDescribedEnumValues = (
  schema: z.ZodType,
  schemaName: string
): DescribedEnumValue[] => {
  const union = throwIfNotZodUnion(schema, schemaName);

  const missing: string[] = [];
  const values: DescribedEnumValue[] = [];
  for (const option of union.options) {
    if (!(option instanceof z.ZodLiteral) || typeof option.value !== 'string') {
      missing.push('(non-literal value)');
      continue;
    }
    const description = option.description?.trim() ?? '';
    if (!description) {
      missing.push(option.value);
      continue;
    }
    values.push({ value: option.value, description });
  }

  throwIfMissingDescribes(missing, `${schemaName} value(s)`);
  return values;
};

/**
 * Reads per-variant `.describe()` copy from a discriminated union, keyed by the
 * discriminator literal. The enum counterpart of {@link getDescribedEnumValues}
 * for unions whose members carry a payload alongside the discriminator.
 */
export const getDescribedVariants = (
  schema: z.ZodType,
  discriminator: string,
  schemaName: string
): DescribedEnumValue[] => {
  const jsonSchema = zodToJsonSchema(schema) as JsonSchemaNode;
  const variants = (jsonSchema.oneOf ?? jsonSchema.anyOf) as JsonSchemaNode[] | undefined;
  if (!variants) {
    throw new SchemaTranslationError(
      `${schemaName} is not a discriminated union. Use z.discriminatedUnion('${discriminator}', ...) with .describe(...) on each member.`
    );
  }

  const missing: string[] = [];
  const values: DescribedEnumValue[] = [];
  for (const variant of variants) {
    const properties = variant.properties as JsonSchemaNode | undefined;
    const discriminatorNode = properties?.[discriminator] as JsonSchemaNode | undefined;
    const value =
      (discriminatorNode?.const as string | undefined) ??
      (discriminatorNode?.enum as string[] | undefined)?.[0];
    if (typeof value !== 'string') {
      missing.push(`(variant with no "${discriminator}" literal)`);
      continue;
    }
    const description = (variant.description as string | undefined)?.trim() ?? '';
    if (!description) {
      missing.push(value);
      continue;
    }
    values.push({ value, description });
  }

  throwIfMissingDescribes(missing, `${schemaName} variant(s)`);
  return values;
};

export const getEpisodeStatusValues = (): string[] =>
  getDescribedEnumValues(alertEpisodeStatusSchema, 'alertEpisodeStatusSchema').map(
    ({ value }) => value
  );

/** Returns the state transition phase names from the operation schema. */
const getStateTransitionFields = (): string[] =>
  Object.keys(setStateTransitionOperationSchema.shape).filter((k) => k !== 'operation');

/**
 * Builds a markdown table from described enum values or union variants.
 */
const generateEnumTable = ({
  header,
  values,
}: {
  header: [string, string];
  values: DescribedEnumValue[];
}): string => {
  const rows = values.map(
    ({ value, description }) => `| \`${value}\` | ${escapeTableCell(description)} |`
  );
  return [`| ${header[0]} | ${header[1]} |`, '|---|---|', ...rows].join('\n');
};

/**
 * Builds a markdown bullet list from described enum values or union variants.
 */
const generateEnumList = (values: DescribedEnumValue[]): string =>
  values.map(({ value, description }) => `- \`${value}\`: ${description}`).join('\n');

/** Formats enum values as an inline comma-separated backtick list. */
export const formatEnumValuesList = (values: readonly string[]): string =>
  values.map((v) => `\`${v}\``).join(', ');

/** Formats a set of strategy values as an inline backtick list. */
const formatStrategySet = (strategies: Set<string>): string =>
  formatEnumValuesList([...strategies]);

/**
 * Generates standalone markdown for throttle / grouping compatibility from
 * `groupingModeSchema`, `PER_EPISODE_STRATEGIES`, `AGGREGATE_STRATEGIES`, and
 * `STRATEGIES_REQUIRING_INTERVAL`.
 */
export const generateThrottleGroupingCompatibilityDoc = (): string => {
  const groupingModesList = generateEnumList(
    getDescribedEnumValues(groupingModeSchema, 'groupingModeSchema')
  );

  const perEpisodeOnlyStrategies = [...PER_EPISODE_STRATEGIES].filter(
    (strategy) => !AGGREGATE_STRATEGIES.has(strategy)
  );
  const notPerEpisodeStrategies = [...AGGREGATE_STRATEGIES].filter(
    (strategy) => !PER_EPISODE_STRATEGIES.has(strategy)
  );

  const caveats: string[] = [];
  if (perEpisodeOnlyStrategies.length > 0) {
    caveats.push(
      `- Only valid with \`per_episode\`: ${formatEnumValuesList(perEpisodeOnlyStrategies)}.`
    );
  }
  if (notPerEpisodeStrategies.length > 0) {
    caveats.push(
      `- Not valid with \`per_episode\`: ${formatEnumValuesList(notPerEpisodeStrategies)}.`
    );
  }
  caveats.push(
    `- Require an \`interval\` (e.g. \`"5m"\`, \`"1h"\`): ${formatStrategySet(
      STRATEGIES_REQUIRING_INTERVAL
    )}.`
  );

  return [
    '# Throttle / Grouping Compatibility',
    '',
    groupingModesList,
    '',
    'Caveats:',
    ...caveats,
    '',
    'If you set both in one request, put `set_grouping` before `set_throttle`. The tool',
    'validates compatibility after all operations run.',
    '',
    'Related: [action-policy-grouping-modes](./action-policy-grouping-modes.md), [action-policy-throttle-strategies](./action-policy-throttle-strategies.md).',
  ].join('\n');
};

/** Product-facing label for a rule kind (`Alerts` / `Events`). Throws if a kind has no UI label. */
const getRuleKindProductLabel = (kind: string): string => {
  const label = RULE_KIND_LABELS[kind as keyof typeof RULE_KIND_LABELS];
  if (!label) {
    throw new SchemaTranslationError(
      `Missing product label for rule kind "${kind}". Add it to RULE_KIND_LABELS.`
    );
  }
  return label;
};

/** Generates the Rule Kind section with heading, per-kind subsections, and immutability note. */
export const generateRuleKindDoc = (): string => {
  const kinds = getDescribedEnumValues(ruleKindSchema, 'ruleKindSchema');
  const episodeStatuses = formatEnumValuesList(getEpisodeStatusValues());
  const transitionFields = formatEnumValuesList(getStateTransitionFields());

  const kindSections = kinds.flatMap(({ value, description }, i) => {
    const heading = `### ${getRuleKindProductLabel(value)} (\`kind: ${value}\`)`;
    const lines = [heading, description];
    if (value === 'alert') {
      lines.push(`Episode statuses: ${episodeStatuses}.`);
      lines.push(`State transition fields: ${transitionFields}.`);
    }
    return i > 0 ? ['', ...lines] : lines;
  });

  const alertLabel = getRuleKindProductLabel('alert');
  const signalLabel = getRuleKindProductLabel('signal');

  return [
    `# Rule Kind: ${alertLabel} vs ${signalLabel}`,
    '',
    `Rules declare a \`kind\` of \`alert\` (${alertLabel}) or \`signal\` (${signalLabel}). This is the most important behavioral split in the system.`,
    '',
    ...kindSections,
    '',
    '## Immutability',
    '`kind` is **immutable on persisted rules** — it can only be set at creation time. The update API rejects changes to `kind`. For draft (in-memory) rules, `set_kind` can change it freely.',
  ].join('\n');
};

/**
 * Generates the notifications-overview reference: action policies, plus how to
 * handle notification requests on Events (`kind: signal`) vs Alerts (`kind: alert`) rules.
 */
export const generateNotificationsOverviewDoc = (): string => {
  const alertLabel = getRuleKindProductLabel('alert');
  const signalLabel = getRuleKindProductLabel('signal');

  return [
    '# Notifications via Action Policies',
    '',
    'Notifications are not configured on the rule itself. Alert episodes are matched and dispatched by **action policies** — space-scoped saved objects that send matched episodes to workflow destinations.',
    '',
    `When the user needs notifications (email, Slack, PagerDuty, etc.), load the \`${ACTION_POLICY_MANAGEMENT_SKILL_ID}\` skill. That skill owns action policy CRUD, workflow destination wiring, and the default notification setup flow.`,
    '',
    '## Notifications Require Alert Kind',
    '',
    `Action policies only process ${alertLabel} (\`kind: alert\`). ${signalLabel} (\`kind: signal\`) do not participate in episode lifecycle or notification dispatch. See the [rule-kind reference](./rule-kind.md) and [episode-lifecycle reference](./episode-lifecycle.md).`,
    '',
    'When a user asks for notifications on a rule that is currently `kind: signal` (or when composing a new rule where the user wants notifications):',
    '',
    `1. **Explain the difference**: ${signalLabel} (\`kind: signal\`) rules are observation-only and do not trigger notifications. ${alertLabel} (\`kind: alert\`) track episode lifecycle and can dispatch to action policies.`,
    `2. If the rule is a **draft (in-memory)**: use \`set_kind\` to change it to \`alert\`, then load the \`${ACTION_POLICY_MANAGEMENT_SKILL_ID}\` skill for notification setup.`,
    `3. If the rule is **persisted**: \`kind\` is immutable after creation. Inform the user that the existing ${signalLabel} (\`kind: signal\`) rule cannot be converted. Offer to create a new ${alertLabel} (\`kind: alert\`) rule with the same query and schedule, then set up notifications on the new rule.`,
    `4. After ensuring the rule is \`kind: alert\`, load the \`${ACTION_POLICY_MANAGEMENT_SKILL_ID}\` skill for notification setup.`,
  ].join('\n');
};

/** Generates the State Transition section with heading, field list from schema, and constraints. */
export const generateStateTransitionDoc = (): string => {
  const jsonSchema = zodToJsonSchema(setStateTransitionOperationSchema) as JsonSchemaNode;
  const properties = (jsonSchema.properties ?? {}) as JsonSchemaNode;

  const describeField = (path: string, node: JsonSchemaNode | undefined): string => {
    const description = node?.description as string | undefined;
    if (!description) {
      throw new SchemaTranslationError(
        `Missing .describe() on set_state_transition field "${path}". Add .describe() to that field on setStateTransitionOperationSchema.`
      );
    }
    return description;
  };

  const bullets = getStateTransitionFields().flatMap((phase) => {
    const phaseNode = properties[phase] as JsonSchemaNode | undefined;
    const phaseProperties = (phaseNode?.properties ?? {}) as JsonSchemaNode;
    return [
      `- \`${phase}\` — ${describeField(phase, phaseNode)}`,
      ...Object.entries(phaseProperties).map(
        ([name, node]) =>
          `  - \`${phase}.${name}\` — ${describeField(`${phase}.${name}`, node as JsonSchemaNode)}`
      ),
    ];
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
    values: getDescribedEnumValues(alertEpisodeStatusSchema, 'alertEpisodeStatusSchema'),
  });

  return [
    '# Episode Lifecycle',
    '',
    'Episodes are the unit of alert state. Each unique group (by `group_hash`) has its own episode. Each episode has a status that reflects where it is in the lifecycle:',
    '',
    table,
    '',
    'Only `kind: alert` rules produce episodes. `kind: signal` rules write raw signal events with no episode tracking.',
  ].join('\n');
};

/** Generates standalone markdown for alert event severity: valid values and ES|QL patterns. */
export const generateSeverityDoc = (): string => {
  const values = formatEnumValuesList(getSeverityValues());

  return [
    '# Alert Event Severity',
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

/** Generates standalone markdown for no-data strategy: values, wiring, and kind constraints. */
export const generateNoDataStrategyDoc = (): string => {
  const table = generateEnumTable({
    header: ['Strategy', 'Behaviour'],
    values: getDescribedVariants(noDataSchema, 'strategy', 'noDataSchema'),
  });

  return [
    '# No-Data Strategy',
    '',
    `\`no_data\` is a **top-level rule field** that controls what happens when the rule finds no data for a group. It is set on \`set_query\` as an object whose \`strategy\` selects the behaviour. Every alert rule is stored with one; omit it and the tool saves \`{ strategy: '${noDataStrategy.ignore}' }\`.`,
    '',
    table,
    '',
    `Every strategy except \`${noDataStrategy.ignore}\` may carry its own presence query:`,
    `\`no_data: { strategy: '${noDataStrategy.keep_last}', query: 'FROM heartbeat-* | STATS count = COUNT(*) BY host.name | WHERE count >= 1' }\`.`,
    'Omit `query` to use `query.base` to decide whether a group has data.',
    '',
    'Signal rules cannot set `no_data` ([rule-kind reference](./rule-kind.md)).',
  ].join('\n');
};

/** Generates standalone markdown for recovery strategy: values, wiring, and kind constraints. */
export const generateRecoveryStrategyDoc = (): string => {
  const list = generateEnumList(getDescribedVariants(recoverySchema, 'strategy', 'recoverySchema'));

  return [
    '# Recovery Strategy',
    '',
    `\`recovery\` is a **top-level rule field** (not inside the query). It is set on \`set_query\` as an object whose \`strategy\` selects the behaviour, and it controls how episodes transition from active to recovering/inactive (see [episode-lifecycle reference](./episode-lifecycle.md)). Every alert rule is stored with one; omit it and the tool saves \`{ strategy: '${recoveryStrategy.no_breach}' }\`. Signal rules (\`kind: signal\`) cannot set \`recovery\` ([rule-kind reference](./rule-kind.md)).`,
    '',
    list,
    '',
    'The two query-backed strategies carry their own ES|QL:',
    `- \`recovery: { strategy: '${recoveryStrategy.condition}', segment: 'WHERE avg_cpu < 0.6' }\` — the segment is appended to \`query.base\`. This requires \`query.breach\`: without a breach segment every row of \`base\` already breaches, so the recovery condition could only return groups that are breaching and the rule would never recover.`,
    `- \`recovery: { strategy: '${recoveryStrategy.query}', query: 'FROM metrics-* | STATS avg_cpu = AVG(cpu) BY host.name | WHERE avg_cpu < 0.6' }\` — an independent full query, usable with or without \`query.breach\`.`,
  ].join('\n');
};

/**
 * Generates markdown for the action-policy matcher shape — both the `tags` and
 * `expression` fields — including the KQL context field table from
 * `MATCHER_CONTEXT_FIELDS`, enriching enum fields from `alertEpisodeStatusSchema`
 * / `alertEventSeveritySchema`.
 */
export const generateMatcherContextDoc = (): string => {
  const episodeStatuses = formatEnumValuesList(getEpisodeStatusValues());
  const severities = formatEnumValuesList(getSeverityValues());

  const formatMatcherFieldType = (path: string, type: string): string => {
    if (path === 'episode_status') return episodeStatuses;
    if (path === 'severity') return severities;
    if (path === 'data') return '`data.*` object';
    return type;
  };

  const rows = MATCHER_CONTEXT_FIELDS.map((field) => {
    const typeCell = escapeTableCell(formatMatcherFieldType(field.path, field.type));
    return `| \`${field.path}\` | ${typeCell} | ${escapeTableCell(field.description)} |`;
  });

  return [
    '# Action Policy Matchers',
    '',
    'A matcher selects which alert **episodes** a policy applies to.',
    'Policies are space-scoped; they are not bound to a rule object.',
    '',
    '```',
    'matcher: { tags?: string[] | null, expression?: string | null }',
    '```',
    '',
    '## `tags` — match by rule tag',
    '',
    `Matches if the episode's rule has **at least one** of the listed tags (OR / any-of).`,
    'Exact string match: case-sensitive, no wildcards, no prefix matching.',
    `Max ${POLICY_MATCHER_TAGS_MAX} tags, up to ${POLICY_MATCHER_TAG_MAX_LENGTH} characters each.`,
    '',
    "> **Important**: `matcher.tags` is matched against the **rule**'s tags, not the",
    "> policy's own name or metadata.",
    '',
    '## `expression` — match by episode content (KQL)',
    '',
    `Max ${MAX_KQL_LENGTH} characters. Only the following fields are available in the KQL expression:`,
    '',
    '| Field | Type | Description |',
    '|---|---|---|',
    ...rows,
    '',
    '> **Note**: `rule.id`, `rule.name`, and `rule.tags` are **not** available in the',
    '> KQL expression. Use `matcher.tags` to scope a policy by rule.',
    '',
    '## How `tags` and `expression` combine',
    '',
    '| `tags` | `expression` | Result |',
    '|---|---|---|',
    '| set | set | **AND** — rule must have a matching tag and KQL must pass |',
    '| set | absent/null | tag constraint only |',
    "| absent/null | set | no tag constraint; any rule's episodes may match if KQL passes |",
    '| absent/null | absent/null | **catch-all** — matches every alert episode in the space |',
    '',
    'If `matcher` itself is `null`, or both fields are empty, the policy is a **catch-all**.',
    'A rule with no tags never matches a policy that has `matcher.tags` set.',
    '',
    '## `set_matcher` replaces the whole matcher',
    '',
    'The `set_matcher` operation replaces the matcher object entirely.',
    'To add tags while keeping an existing KQL filter, resend the current `expression`:',
    '',
    '```json',
    `{ "operation": "set_matcher", "matcher": { "tags": ["team-sre"], "expression": "severity: \\"critical\\"" } }`,
    '```',
    '',
    '## Examples',
    '',
    '```json',
    `// one rule (via shared link tag):`,
    `{ "tags": ["notify-high-cpu"] }`,
    '',
    `// a family of rules by tag:`,
    `{ "tags": ["production", "payments"] }`,
    '',
    `// severity filter across all rules:`,
    `{ "expression": "severity: \\"critical\\"" }`,
    '',
    `// both (rule family AND severity):`,
    `{ "tags": ["production"], "expression": "severity: \\"critical\\"" }`,
    '```',
  ].join('\n');
};

/** Generates standalone markdown for action-policy grouping modes. */
export const generateGroupingModesDoc = (): string => {
  const list = generateEnumList(getDescribedEnumValues(groupingModeSchema, 'groupingModeSchema'));

  return [
    '# Grouping Modes',
    '',
    list,
    '',
    'Throttle strategy must be compatible with the grouping mode — see [action-policy-throttle-grouping-compatibility](./action-policy-throttle-grouping-compatibility.md).',
  ].join('\n');
};

/** Generates standalone markdown for action-policy throttle strategies. */
export const generateThrottleStrategiesDoc = (): string => {
  const list = generateEnumList(
    getDescribedEnumValues(throttleStrategySchema, 'throttleStrategySchema')
  );

  return [
    '# Throttle Strategies',
    '',
    list,
    '',
    'Compatibility with grouping modes — see [action-policy-throttle-grouping-compatibility](./action-policy-throttle-grouping-compatibility.md).',
  ].join('\n');
};

/** Generates standalone markdown for action-policy workflow destinations. */
export const generateWorkflowDestinationsDoc = (): string =>
  [
    '# Workflows',
    '',
    'A workflow is a **concrete automation defined in YAML** that executes when dispatched by an action policy.',
    '',
    '- Workflow steps can use Kibana **connectors** (email, Slack, PagerDuty, etc.) via the `connector-id` field on each step.',
    '- Action policy destinations reference **workflow IDs**, never connector IDs directly.',
    '- Destination workflows must use **exactly one** `triggers: - type: manual` trigger — never `alert`.',
    '- For deeper connector knowledge (types, `connector-id` usage, discovery tools), load the `workflow-authoring` skill.',
  ].join('\n');

/** Generates standalone markdown for the end-to-end notification dispatch path. */
export const generateDispatchFlowDoc = (): string =>
  [
    '# Dispatch Flow',
    '',
    'The end-to-end notification path:',
    '',
    '1. **Rule** (`kind: alert`) evaluates its ES|QL query and writes alert episodes to `.rule-events`.',
    '2. **Dispatcher** (runs on its own Task Manager schedule) reads episodes from `.rule-events`.',
    '3. Dispatcher loads **enabled action policies** for the relevant space.',
    "4. **Matcher evaluation**: each policy's KQL matcher is tested against each episode's context.",
    "5. **Grouping**: matched episodes are grouped according to the policy's `groupingMode` / `groupBy`.",
    "6. **Throttling**: groups are filtered based on the policy's throttle strategy and notification history.",
    "7. **Dispatch**: eligible groups are sent to the policy's **workflow destinations** via `scheduleWorkflow`.",
    '8. **Workflow execution**: workflow steps run, using connectors to deliver notifications (email, Slack, etc.).',
    '',
    "Signal rules (`kind: signal`) are excluded at step 2 — the dispatcher query only selects `type == 'alert'` events.",
  ].join('\n');

/** Generates standalone markdown for the default single-rule action-policy create path. */
export const generateSingleRuleActionPolicyDoc = (): string =>
  [
    '# Single-rule Action Policies',
    '',
    'Use this path when the user wants notifications for **one specific rule**.',
    '',
    'Action policies only process alert episodes. If the rule is `kind: signal`, do not',
    'proceed: ask the user (or the rule-management skill) to convert or recreate the',
    'rule as `kind: alert` first.',
    '',
    '## Scoping a policy to one rule',
    '',
    'A policy matches **episodes**, not a rule object. The only way to scope one policy',
    'to one rule is a **shared link tag on both sides**:',
    '',
    '- The rule must carry a tag that uniquely identifies it.',
    "- The policy's `matcher.tags` must contain that same tag.",
    '',
    'Use the convention `notify-<rule-slug>` (lowercase kebab of the rule name,',
    'for example `notify-high-cpu-prod`).',
    '',
    '## Steps',
    '',
    '### 1. Add the link tag to the rule',
    '',
    'Call `manage_rule` → `set_metadata` with `tags: [<all existing tags>, "notify-<rule-slug>"]`.',
    '',
    '> **Tags are replaced wholesale.** Read the current tags off the rule attachment first',
    '> and re-send them alongside the new link tag. The rule tag cap is 20; the',
    '> agent-builder provenance tag consumes one slot. If the rule is already at the cap,',
    '> ask the user which existing tag to drop.',
    '',
    '> **Save reminder**: `manage_rule` only updates the in-memory rule attachment.',
    '> The link tag only takes effect once the user saves the rule',
    '> (Rule → Workflow → Action Policy save order).',
    '',
    '### 2. Create the action policy',
    '',
    'Call `manage_action_policy` with these operations in order:',
    '',
    '1. `set_metadata`: name = `"Notify on <rule-name>"`, description = `"Default notification for <rule-name>"`',
    '2. `set_destinations`: `[{ type: "workflow", id: "<workflowId>" }]`',
    '   - Use the `workflowId` passed to `generate_workflow`, **not** the workflow `attachmentId`.',
    '3. `set_matcher`: `{ tags: ["notify-<rule-slug>"] }` — **do not omit**.',
    '   An omitted or empty matcher is a space-wide catch-all, not "this rule".',
    '4. `set_grouping`: `per_episode`',
    '5. `set_throttle`: `{ strategy: "on_status_change" }`',
    '6. `validate`',
    '',
    'If the rule already has a tag that uniquely identifies it, you may reuse that tag',
    'instead of adding `notify-<rule-slug>` — but confirm it is not shared with other rules.',
    '',
    'If the user explicitly requests a cross-rule or shared policy, consult the',
    '[multi-rule action policies reference](./action-policy-multi-rule.md).',
  ].join('\n');

/** Generates standalone markdown for shared / multi-rule action-policy matchers. */
export const generateMultiRuleActionPolicyDoc = (): string =>
  [
    '# Multi-rule Action Policies',
    '',
    'Use this path when the user wants **one policy across several rules**, a space-wide',
    'catch-all, or routing by tag/severity.',
    '',
    'Create the policy with `set_metadata` (name by intent, not by one rule),',
    '`set_destinations` (same `workflowId` rule as the single-rule path), a matcher from',
    'the options below, then `set_grouping` / `set_throttle`.',
    '',
    'A policy matches **episodes**, not a rule object. Policies are space-scoped and are',
    'not bound to a single rule. The matcher supports a `tags` array (matched against rule',
    'tags) and an optional KQL `expression` over',
    '[matcher context fields](./action-policy-matchers.md).',
    '',
    '- **Catch-all**: omit `set_matcher` or set matcher to empty/`null`. Confirm with the',
    '  user first — this notifies on every `kind: alert` episode in the space, including',
    '  rules created later.',
    '- **A family of rules by tag**: `matcher: { tags: ["production"] }`. Matched against the rule\'s tags.',
    '  Prefer this when the set of rules will grow.',
    '- **Route by severity across rules**: `matcher: { expression: "severity: \\"critical\\"" }` (or combine with tags).',
    '  Useful for a PagerDuty policy vs an email policy.',
    '- **Reuse destinations**: one workflow can serve many rules. Keep Liquid generic —',
    '  `inputs.payload.rules[ep.rule_id].name`, `ep.episode_status`, and guarded',
    '  `ep.data.*` — because query columns often differ across rules. If two rules need',
    '  different message shapes, use two policies (or two workflows) rather than one',
    '  brittle template. See [workflow-dispatch-payload](./workflow-dispatch-payload.md).',
    '- **Search first**: run `platform.core.sml_search` for existing policies before adding',
    '  another catch-all or overlapping tag matcher.',
    '- **Grouping**: `per_episode` is still a safe default. `all` batches mixed-rule',
    '  episodes into a single notification; only use it when the user wants one combined',
    '  message.',
    '',
    'Name shared policies by intent (`"Notify production alerts"`, `"Page on critical"`),',
    'not by a single rule name.',
    '',
    'For the default one-rule path, see [single-rule action policies](./action-policy-single-rule.md).',
  ].join('\n');

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
      `Missing built-in workflow input definition "${ALERTING_V2_NOTIFICATION_GROUP_INPUT_DEFINITION_ID}" required by generateActionPolicyWorkflowPayloadDoc.`
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
    'Catalog of fields the dispatcher passes as `inputs.payload`. In Liquid:',
    '`{{ inputs.payload.<field> }}`, and inside',
    '`{% for ep in inputs.payload.episodes %}` use `{{ ep.<field> }}`.',
    '',
    '## Top-Level Fields (`inputs.payload`)',
    '',
    topLevelTable,
  ];

  if (episodeTable) {
    sections.push('', '## Episode Fields (`inputs.payload.episodes[]`)', '', episodeTable);
  }

  sections.push(
    '',
    '### `data`',
    '',
    "`data` is the rule's ES|QL result row (each query row is written as `data: rowDoc`",
    'on the alert event). Columns depend on the rule query, so they are not listed above.',
    '',
    '- Nested dotted names: `ep.data.host.name`, not `ep.data["host.name"]`.',
    '- Discover columns with `| LIMIT 0` if they are unclear.',
    '- Guard empty `data` on recovering/inactive: `| default` or `{% if ep.data %}`.',
    '',
    '## Example',
    '',
    'For `FROM logs-* | STATS error_count = COUNT(*) BY host.name | WHERE error_count >= 5`:',
    '',
    '```yaml',
    "version: '1'",
    'name: "Notify: <rule-name>"',
    'enabled: true',
    'triggers:',
    '  - type: manual',
    'steps:',
    '  - name: send_email',
    '    type: email',
    '    connector-id: <connector-id>',
    '    with:',
    '      to:',
    '        - <user-provided-email>',
    '      subject: "Alert: {{ inputs.payload.episodes | size }} episode(s)"',
    '      message: >',
    '        {% for ep in inputs.payload.episodes %}',
    '        - Rule: {{ inputs.payload.rules[ep.rule_id].name | default: "unknown" }}',
    '          Host: {{ ep.data.host.name | default: "unknown" }}',
    '          Errors: {{ ep.data.error_count | default: "n/a" }}',
    '          Status: {{ ep.episode_status }}',
    '        {% endfor %}',
    '',
    '        View execution: {{ execution.url }}',
    '```'
  );

  return sections.join('\n');
};
