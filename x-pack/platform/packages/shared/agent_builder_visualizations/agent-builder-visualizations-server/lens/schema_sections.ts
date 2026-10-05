/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues, omit, partition, pick, uniq } from 'lodash';
import { z } from '@kbn/zod';
import { xyConfigSchemaESQL } from '@kbn/lens-embeddable-utils';
import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { chartTypeRegistry } from './chart_type_registry';

export const LOAD_SCHEMA_SECTIONS_TOOL_NAME = 'load_schema_sections';

/**
 * Matches descriptions that carry constraint or usage info worth keeping
 * in the LLM prompt (numbers, ranges, defaults, examples, units).
 * Everything else (e.g. "Label for the operation") is stripped to save tokens.
 */
const USEFUL_DESCRIPTION_RE =
  /(\d|default|e\.g\.|i\.e\.|example|must|between|minimum|maximum|at least|at most|up to|pixels|millisecond|factor|typical|legacy|truncat)/i;

const DEF_REF_PREFIX = '#/$defs/';

/** `type` is set by every example, and the system injects `data_source`. */
const EXCLUDED_KEYS = ['type', 'data_source'] as const;

type JsonNode = Record<string, unknown>;

interface ChartSchemaSections {
  /** The top-level config keys the model can load. */
  schema: z.ZodObject;
  /** One line per section that lists the fields it holds. */
  index: string;
}

const isJsonNode = (value: unknown): value is JsonNode =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Copies a JSON schema without the descriptions that carry no constraint or usage info. */
const trimSchemaDescriptions = <T>(schema: T): T =>
  JSON.parse(JSON.stringify(schema), (key, value) =>
    key === 'description' && typeof value === 'string' && !USEFUL_DESCRIPTION_RE.test(value)
      ? undefined
      : value
  );

const UNION_KEYS = ['anyOf', 'oneOf'] as const;

/** Subschemas a node combines under the given keys, e.g. the members of an `anyOf` union. */
const getSubschemas = (node: JsonNode, keys: readonly string[]): unknown[] =>
  keys.flatMap((key) => {
    const subschemas = node[key];
    return Array.isArray(subschemas) ? subschemas : [];
  });

const resolveRef = (node: unknown, defs: JsonNode): unknown => {
  let current = node;
  const seen = new Set<string>();
  while (isJsonNode(current) && typeof current.$ref === 'string' && !seen.has(current.$ref)) {
    seen.add(current.$ref);
    current = defs[current.$ref.slice(DEF_REF_PREFIX.length)];
  }
  return current;
};

/** Merges fields of union variants, keeping every variant's schema for a shared field name. */
const mergeFields = (target: JsonNode, source: JsonNode): JsonNode => {
  for (const [name, schema] of Object.entries(source)) {
    target[name] =
      name in target && target[name] !== schema ? { anyOf: [target[name], schema] } : schema;
  }
  return target;
};

/** Object fields of a schema node, looking through refs, unions, and array items. */
const getFields = (node: unknown, defs: JsonNode, seen = new Set<unknown>()): JsonNode => {
  const resolved = resolveRef(node, defs);
  if (!isJsonNode(resolved) || seen.has(resolved)) {
    return {};
  }
  seen.add(resolved);
  const variants = getSubschemas(resolved, [...UNION_KEYS, 'allOf']);
  return [
    isJsonNode(resolved.properties) ? resolved.properties : {},
    ...[resolved.items, ...variants].map((child) => getFields(child, defs, seen)),
  ].reduce(mergeFields, {});
};

/**
 * Ancestors of a node on the current path, so recursive definitions stop instead of looping.
 * Siblings may share a definition, so this tracks the path rather than every node visited.
 */
type Ancestors = ReadonlySet<unknown>;

/** Names of the fields a schema node requires. A union requires the fields every variant requires. */
const getRequiredFields = (
  node: unknown,
  defs: JsonNode,
  ancestors: Ancestors = new Set()
): Set<string> => {
  const resolved = resolveRef(node, defs);
  if (!isJsonNode(resolved) || ancestors.has(resolved)) {
    return new Set();
  }
  const path = new Set([...ancestors, resolved]);
  if (resolved.items) {
    return getRequiredFields(resolved.items, defs, path);
  }
  const ownRequired = Array.isArray(resolved.required)
    ? resolved.required.filter((name): name is string => typeof name === 'string')
    : [];
  const partsRequired = getSubschemas(resolved, ['allOf']).flatMap((part) => [
    ...getRequiredFields(part, defs, path),
  ]);
  const variantsRequired = getSubschemas(resolved, UNION_KEYS).map((variant) =>
    getRequiredFields(variant, defs, path)
  );
  const [firstVariantRequired = new Set<string>()] = variantsRequired;
  const unionRequired = [...firstVariantRequired].filter((name) =>
    variantsRequired.every((required) => required.has(name))
  );
  return new Set([...ownRequired, ...partsRequired, ...unionRequired]);
};

/**
 * Allowed values of an enum-like node: an enum, a constant, an array of them, or a union
 * whose every variant is one of them.
 */
const getEnumValues = (
  node: unknown,
  defs: JsonNode,
  ancestors: Ancestors = new Set()
): unknown[] => {
  const resolved = resolveRef(node, defs);
  if (!isJsonNode(resolved) || ancestors.has(resolved)) {
    return [];
  }
  if (Array.isArray(resolved.enum)) {
    return resolved.enum;
  }
  if ('const' in resolved) {
    return [resolved.const];
  }
  const path = new Set([...ancestors, resolved]);
  if (resolved.items) {
    return getEnumValues(resolved.items, defs, path);
  }
  const values = getSubschemas(resolved, UNION_KEYS).map((variant) =>
    getEnumValues(variant, defs, path)
  );
  return values.length > 0 && values.every((variantValues) => variantValues.length > 0)
    ? uniq(values.flat())
    : [];
};

/** What the index states about a field. */
interface FieldModel {
  name: string;
  required: boolean;
  values: unknown[];
  fields: FieldModel[];
}

/** What the index states about a section. */
interface SectionModel {
  name: string;
  fields: FieldModel[];
  /** The fields of each union variant, set only when the variants hold different fields. */
  variants: FieldModel[][];
  /** The JSON type, for sections without fields. */
  type: string;
}

/** The index lists section fields and their own fields, never deeper. */
const MAX_FIELD_DEPTH = 2;

/** Fields of a schema node down to `MAX_FIELD_DEPTH`, counting the node's own fields as depth 1. */
const toFieldModels = (node: unknown, defs: JsonNode, depth = 1): FieldModel[] => {
  if (depth > MAX_FIELD_DEPTH) {
    return [];
  }
  const required = getRequiredFields(node, defs);
  return Object.entries(getFields(node, defs)).map(([name, field]) => ({
    name,
    required: required.has(name),
    values: getEnumValues(field, defs),
    fields: toFieldModels(field, defs, depth + 1),
  }));
};

/** Union variants of a section, or of its array items. */
const getUnionVariants = (section: unknown, defs: JsonNode): unknown[] => {
  const resolved = resolveRef(section, defs);
  const node = isJsonNode(resolved) ? resolveRef(resolved.items ?? resolved, defs) : undefined;
  return isJsonNode(node) ? getSubschemas(node, UNION_KEYS) : [];
};

/**
 * Keeps union variants apart when they hold different fields, because merging them
 * would hide which field belongs to which variant.
 */
const toSectionModel = (name: string, section: unknown, defs: JsonNode): SectionModel => {
  const variants = getUnionVariants(section, defs).map((variant) => toFieldModels(variant, defs));
  const fieldSets = variants.map((fields) =>
    fields
      .map((field) => field.name)
      .sort()
      .join()
  );
  const hasDistinctVariants =
    variants.length > 1 && fieldSets.every(Boolean) && new Set(fieldSets).size > 1;
  const resolved = resolveRef(section, defs);
  return {
    name,
    fields: toFieldModels(section, defs),
    variants: hasDistinctVariants ? variants : [],
    type: isJsonNode(resolved) && typeof resolved.type === 'string' ? resolved.type : 'value',
  };
};

/**
 * Nested fields list their values only when there are a few, so long lists
 * (format units, color types) do not repeat on every line.
 */
const MAX_NESTED_ENUM_VALUES = 4;

/** Renders a field as `name*: a|b`, or as `name (subfields)` when it has fields of its own. */
const renderField = ({ name, required, values, fields }: FieldModel, depth = 1): string => {
  const label = required ? `${name}*` : name;
  if (fields.length > 0) {
    return `${label} (${fields.map((field) => renderField(field, depth + 1)).join(', ')})`;
  }
  const maxValues = depth > 1 ? MAX_NESTED_ENUM_VALUES : Infinity;
  return values.length > 0 && values.length <= maxValues ? `${label}: ${values.join('|')}` : label;
};

/**
 * Lists the fields every variant shares once, then the fields of each variant. Fixed-value
 * fields (e.g. `type: primary`) name a variant, so they come first in it.
 */
const renderVariants = (variants: readonly FieldModel[][]): string => {
  const variantFields = variants.map((fields) => {
    const [fixedFields, otherFields] = partition(fields, ({ values }) => values.length === 1);
    return [...fixedFields, ...otherFields].map((field) => renderField(field));
  });
  const [firstFields] = variantFields;
  const sharedFields = firstFields.filter((field) =>
    variantFields.every((fields) => fields.includes(field))
  );
  const variantDescriptions = variantFields.map(
    (fields) => `(${fields.filter((field) => !sharedFields.includes(field)).join(', ')})`
  );
  return [...sharedFields, `one of: ${variantDescriptions.join(' | ')}`].join(', ');
};

// Listing enum values lets the model write fields like `layers[].type` or
// `styling.values.mode` without loading the section or guessing the values.
const renderSection = ({ name, fields, variants, type }: SectionModel): string => {
  if (variants.length > 0) {
    return `- ${name}: ${renderVariants(variants)}`;
  }
  return `- ${name}: ${
    fields.length > 0 ? fields.map((field) => renderField(field)).join(', ') : type
  }`;
};

const toJsonSchema = (schema: z.ZodObject) =>
  trimSchemaDescriptions(z.toJSONSchema(schema, { io: 'input' })) as {
    properties?: JsonNode;
    $defs?: JsonNode;
  };

/** Rebuilds a chart config schema with only the top-level keys the model can load. */
const toSectionsSchema = ({ shape }: z.ZodObject): z.ZodObject =>
  z.object(omit(shape, EXCLUDED_KEYS));

/**
 * XY sections describe ES|QL data layers only. The system injects an ES|QL
 * `data_source` into every layer, which reference line and annotation layers reject.
 */
const [xyDataLayerSchema] = xyConfigSchemaESQL.shape.layers.element.options;
const xySectionsSchema = toSectionsSchema(xyConfigSchemaESQL).extend({
  layers: z.array(xyDataLayerSchema.omit({ data_source: true })).min(1),
});

const buildSchemaSections = (schema: z.ZodObject): ChartSchemaSections => {
  const { properties = {}, $defs = {} } = toJsonSchema(schema);
  const index = Object.entries(properties)
    .map(([name, section]) => renderSection(toSectionModel(name, section, $defs)))
    .join('\n');
  return { schema, index };
};

const chartSchemaSections = mapValues(chartTypeRegistry, ({ schema }, chartType) =>
  buildSchemaSections(
    chartType === SupportedChartType.XY ? xySectionsSchema : toSectionsSchema(schema)
  )
);

/** Names of the sections the config author can load for a chart type. */
export const getSchemaSectionNames = (chartType: SupportedChartType): string[] =>
  Object.keys(chartSchemaSections[chartType].schema.shape);

/** Lists the loadable sections of a chart type with the fields each one holds. */
export const getSchemaSectionIndex = (chartType: SupportedChartType): string =>
  chartSchemaSections[chartType].index;

/** Renders the JSON schema of the given sections, with the definitions they reference. */
export const renderSchemaSections = (
  chartType: SupportedChartType,
  sectionNames: readonly string[]
): string => {
  const { shape } = chartSchemaSections[chartType].schema;
  const { properties, $defs } = toJsonSchema(z.object(pick(shape, sectionNames)));
  return JSON.stringify({ properties, ...($defs ? { $defs } : {}) });
};

/** Keeps the names that are loadable sections of the chart type. */
export const filterSchemaSections = (
  chartType: SupportedChartType,
  names: readonly unknown[]
): string[] => {
  const { shape } = chartSchemaSections[chartType].schema;
  return uniq(names).filter(
    (name): name is string => typeof name === 'string' && Object.hasOwn(shape, name)
  );
};

/** Sections that hold the fields a config validation error points at. */
export const getFailingSchemaSections = (chartType: SupportedChartType, error: unknown): string[] =>
  error instanceof z.ZodError
    ? filterSchemaSections(
        chartType,
        error.issues.map(({ path: [section] }) => section)
      )
    : [];

/** The bounded tool the config author calls to load schema sections the example does not show. */
export const createLoadSchemaSectionsTool = (chartType: SupportedChartType) => {
  const names = getSchemaSectionNames(chartType);
  return {
    name: LOAD_SCHEMA_SECTIONS_TOOL_NAME,
    description:
      'Returns the JSON schema of the listed configuration sections. Call it at most once, listing every section the request needs that the example does not show.',
    schema: z.object({
      sections: z.array(z.enum(names)).min(1).max(names.length),
    }),
  };
};
