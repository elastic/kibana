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
} from '@kbn/alerting-v2-schemas';
import {
  ALERTING_V2_NOTIFICATION_GROUP_INPUT_DEFINITION_ID,
  builtinWorkflowInputDefinitions,
} from '@kbn/workflows';
import { ruleOperationSchema } from '../tools/manage_rule/operations';
import { actionPolicyOperationSchema } from '../tools/manage_action_policy/operations';

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
