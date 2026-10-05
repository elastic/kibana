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

/** Names of the fields a schema node requires. A union requires the fields every variant requires. */
const getRequiredFields = (node: unknown, defs: JsonNode): Set<string> => {
  const resolved = resolveRef(node, defs);
  if (!isJsonNode(resolved)) {
    return new Set();
  }
  if (resolved.items) {
    return getRequiredFields(resolved.items, defs);
  }
  const ownRequired = Array.isArray(resolved.required)
    ? resolved.required.filter((name): name is string => typeof name === 'string')
    : [];
  const partsRequired = getSubschemas(resolved, ['allOf']).flatMap((part) => [
    ...getRequiredFields(part, defs),
  ]);
  const variantsRequired = getSubschemas(resolved, UNION_KEYS).map((variant) =>
    getRequiredFields(variant, defs)
  );
  const [firstVariantRequired = new Set<string>()] = variantsRequired;
  const unionRequired = [...firstVariantRequired].filter((name) =>
    variantsRequired.every((required) => required.has(name))
  );
  return new Set([...ownRequired, ...partsRequired, ...unionRequired]);
};

/** Fields of a schema node, with `*` marking the names of required ones. */
const getLabeledFields = (node: unknown, defs: JsonNode): Array<[string, unknown]> => {
  const required = getRequiredFields(node, defs);
  return Object.entries(getFields(node, defs)).map(([name, field]) => [
    required.has(name) ? `${name}*` : name,
    field,
  ]);
};

/** Allowed values of an enum-like node: an enum, a constant, a union of them, or an array of them. */
const getEnumValues = (node: unknown, defs: JsonNode): unknown[] => {
  const resolved = resolveRef(node, defs);
  if (!isJsonNode(resolved)) {
    return [];
  }
  if (Array.isArray(resolved.enum)) {
    return resolved.enum;
  }
  if ('const' in resolved) {
    return [resolved.const];
  }
  if (resolved.items) {
    return getEnumValues(resolved.items, defs);
  }
  const values = getSubschemas(resolved, UNION_KEYS).map((variant) => getEnumValues(variant, defs));
  return values.length > 0 && values.every((variantValues) => variantValues.length > 0)
    ? uniq(values.flat())
    : [];
};

/**
 * Nested fields list their values only when there are a few, so long lists
 * (format units, color types) do not repeat on every line.
 */
const MAX_NESTED_ENUM_VALUES = 4;

const describeField = (name: string, node: unknown, defs: JsonNode, maxValues = Infinity) => {
  const values = getEnumValues(node, defs);
  return values.length > 0 && values.length <= maxValues ? `${name}: ${values.join('|')}` : name;
};

/** Describes a section field, listing its own fields one level down when it has any. */
const describeSectionField = (name: string, node: unknown, defs: JsonNode): string => {
  const subfields = getLabeledFields(node, defs).map(([subname, subnode]) =>
    describeField(subname, subnode, defs, MAX_NESTED_ENUM_VALUES)
  );
  return subfields.length > 0
    ? `${name} (${subfields.join(', ')})`
    : describeField(name, node, defs);
};

/**
 * Union variants of a section, or of its array items, when they hold different fields.
 * Merging them would hide which field belongs to which variant.
 */
const getDistinctVariants = (section: unknown, defs: JsonNode): unknown[] => {
  const resolved = resolveRef(section, defs);
  const node = isJsonNode(resolved) ? resolveRef(resolved.items ?? resolved, defs) : undefined;
  if (!isJsonNode(node)) {
    return [];
  }
  const variants = getSubschemas(node, UNION_KEYS);
  const fieldSets = variants.map((variant) => Object.keys(getFields(variant, defs)).sort().join());
  return variants.length > 1 && fieldSets.every(Boolean) && new Set(fieldSets).size > 1
    ? variants
    : [];
};

/**
 * Lists the fields every variant shares once, then the fields of each variant. Fixed-value
 * fields (e.g. `type: primary`) name a variant, so they come first in it.
 */
const describeVariants = (variants: readonly unknown[], defs: JsonNode): string => {
  const variantFields = variants.map((variant) => {
    const [fixedFields, otherFields] = partition(
      getLabeledFields(variant, defs),
      ([, node]) => getEnumValues(node, defs).length === 1
    );
    return [...fixedFields, ...otherFields].map(([name, node]) =>
      describeSectionField(name, node, defs)
    );
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
const describeSection = (section: unknown, defs: JsonNode): string => {
  const variants = getDistinctVariants(section, defs);
  if (variants.length > 0) {
    return describeVariants(variants, defs);
  }
  const fields = getLabeledFields(section, defs).map(([name, node]) =>
    describeSectionField(name, node, defs)
  );
  if (fields.length > 0) {
    return fields.join(', ');
  }
  const resolved = resolveRef(section, defs);
  return isJsonNode(resolved) && typeof resolved.type === 'string' ? resolved.type : 'value';
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
    .map(([name, section]) => `- ${name}: ${describeSection(section, $defs)}`)
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
