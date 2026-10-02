/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omitBy, pick, uniq } from 'lodash';
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
const EXCLUDED_KEYS = new Set(['type', 'data_source']);

type JsonNode = Record<string, unknown>;

interface ChartSchemaSections {
  /** Top-level config keys the model can load, mapped to their JSON schema. */
  sections: JsonNode;
  /** Definitions the sections reference. */
  defs: JsonNode;
  /** One line per section that lists the fields it holds. */
  index: string;
}

const isJsonNode = (value: unknown): value is JsonNode =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const trimSchemaDescriptions = (node: unknown): unknown => {
  if (Array.isArray(node)) {
    return node.map(trimSchemaDescriptions);
  }
  if (isJsonNode(node)) {
    const result: JsonNode = {};
    for (const [key, value] of Object.entries(node)) {
      if (
        key === 'description' &&
        typeof value === 'string' &&
        !USEFUL_DESCRIPTION_RE.test(value)
      ) {
        continue;
      }
      result[key] = trimSchemaDescriptions(value);
    }
    return result;
  }
  return node;
};

const resolveRef = (node: unknown, defs: JsonNode): unknown => {
  let current = node;
  const seen = new Set<string>();
  while (isJsonNode(current) && typeof current.$ref === 'string' && !seen.has(current.$ref)) {
    seen.add(current.$ref);
    current = defs[current.$ref.slice(DEF_REF_PREFIX.length)];
  }
  return current;
};

const collectDefRefs = (node: unknown, defs: JsonNode, refs: Set<string>): void => {
  if (Array.isArray(node)) {
    node.forEach((child) => collectDefRefs(child, defs, refs));
    return;
  }
  if (!isJsonNode(node)) {
    return;
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === '$ref' && typeof value === 'string' && value.startsWith(DEF_REF_PREFIX)) {
      const name = value.slice(DEF_REF_PREFIX.length);
      if (!refs.has(name)) {
        refs.add(name);
        collectDefRefs(defs[name], defs, refs);
      }
    } else {
      collectDefRefs(value, defs, refs);
    }
  }
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
  const variants = [resolved.anyOf, resolved.oneOf, resolved.allOf].flatMap((variant) =>
    Array.isArray(variant) ? variant : []
  );
  return [
    isJsonNode(resolved.properties) ? resolved.properties : {},
    ...[resolved.items, ...variants].map((child) => getFields(child, defs, seen)),
  ].reduce(mergeFields, {});
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
  const variants = [resolved.anyOf, resolved.oneOf].flatMap((variant) =>
    Array.isArray(variant) ? variant : []
  );
  const values = variants.map((variant) => getEnumValues(variant, defs));
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

// Listing enum values lets the model write fields like `layers[].type` or
// `styling.values.mode` without loading the section or guessing the values.
const describeSection = (section: unknown, defs: JsonNode): string => {
  const fields = Object.entries(getFields(section, defs)).map(([name, child]) => {
    const subfields = Object.entries(getFields(child, defs)).map(([subname, subchild]) =>
      describeField(subname, subchild, defs, MAX_NESTED_ENUM_VALUES)
    );
    return subfields.length > 0
      ? `${name} (${subfields.join(', ')})`
      : describeField(name, child, defs);
  });
  if (fields.length > 0) {
    return fields.join(', ');
  }
  const resolved = resolveRef(section, defs);
  return isJsonNode(resolved) && typeof resolved.type === 'string' ? resolved.type : 'value';
};

const buildSchemaSections = (schema: z.ZodType): ChartSchemaSections => {
  const { properties, $defs } = trimSchemaDescriptions(z.toJSONSchema(schema, { io: 'input' })) as {
    properties?: JsonNode;
    $defs?: JsonNode;
  };
  const sections = omitBy(properties ?? {}, (_, key) => EXCLUDED_KEYS.has(key));
  const defs = $defs ?? {};
  const index = Object.entries(sections)
    .map(([name, section]) => `- ${name}: ${describeSection(section, defs)}`)
    .join('\n');
  return { sections, defs, index };
};

/**
 * XY sections describe ES|QL data layers only. The system injects an ES|QL
 * `data_source` into every layer, which reference line and annotation layers reject.
 */
const [xyDataLayerSchema] = xyConfigSchemaESQL.shape.layers.element.options;
const xySectionsSchema = xyConfigSchemaESQL.extend({
  layers: z.array(xyDataLayerSchema.omit({ data_source: true })).min(1),
});

const chartSchemaSections = Object.fromEntries(
  Object.entries(chartTypeRegistry).map(([chartType, { schema }]) => [
    chartType,
    buildSchemaSections(chartType === SupportedChartType.XY ? xySectionsSchema : schema),
  ])
) as Record<SupportedChartType, ChartSchemaSections>;

/** Lists the loadable sections of a chart type with the fields each one holds. */
export const getSchemaSectionIndex = (chartType: SupportedChartType): string =>
  chartSchemaSections[chartType].index;

/** Renders the JSON schema of the given sections, with the definitions they reference. */
export const renderSchemaSections = (
  chartType: SupportedChartType,
  sectionNames: readonly string[]
): string => {
  const { sections, defs } = chartSchemaSections[chartType];
  const properties = pick(sections, sectionNames);
  const refs = new Set<string>();
  collectDefRefs(properties, defs, refs);
  return JSON.stringify({
    properties,
    ...(refs.size > 0 ? { $defs: pick(defs, [...refs]) } : {}),
  });
};

/** Keeps the names that are loadable sections of the chart type. */
export const filterSchemaSections = (
  chartType: SupportedChartType,
  names: readonly unknown[]
): string[] => {
  const { sections } = chartSchemaSections[chartType];
  return uniq(names).filter(
    (name): name is string => typeof name === 'string' && Object.hasOwn(sections, name)
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
  const names = Object.keys(chartSchemaSections[chartType].sections);
  return {
    name: LOAD_SCHEMA_SECTIONS_TOOL_NAME,
    description:
      'Returns the JSON schema of the listed configuration sections. Call it at most once, listing every section the request needs that the example does not show.',
    schema: z.object({
      sections: z.array(z.enum(names)).min(1).max(names.length),
    }),
  };
};
