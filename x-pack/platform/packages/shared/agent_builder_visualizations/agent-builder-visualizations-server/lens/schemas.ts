/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { chartTypeRegistry } from './chart_type_registry';

type JsonSchemaNode = Record<string, unknown>;

const DEFS_REF_PREFIX = '#/$defs/';

/**
 * Properties the graph owns and injects after the model responds. Removing
 * them from the prompt schema keeps the model from restating or reshaping them.
 */
const SYSTEM_OWNED_PROPERTIES = ['data_source', 'filters'];

/**
 * Matches descriptions that carry constraint or usage info worth keeping
 * in the LLM prompt (numbers, ranges, defaults, examples, units).
 * Everything else (e.g. "Label for the operation") is stripped to save tokens.
 */
const USEFUL_DESCRIPTION_RE =
  /(\d|default|e\.g\.|i\.e\.|example|must|between|minimum|maximum|at least|at most|up to|pixels|millisecond|factor|typical|legacy|truncat)/i;

const isSchemaNode = (node: unknown): node is JsonSchemaNode =>
  node !== null && typeof node === 'object' && !Array.isArray(node);

/**
 * Applies `visit` to every object node of the schema, parents before children.
 */
const mapSchemaNodes = (
  node: unknown,
  visit: (schemaNode: JsonSchemaNode) => JsonSchemaNode
): unknown => {
  if (Array.isArray(node)) {
    return node.map((item) => mapSchemaNodes(item, visit));
  }
  if (!isSchemaNode(node)) {
    return node;
  }
  return Object.fromEntries(
    Object.entries(visit(node)).map(([key, value]) => [key, mapSchemaNodes(value, visit)])
  );
};

const trimDescription = (node: JsonSchemaNode): JsonSchemaNode => {
  const { description, ...rest } = node;
  if (typeof description === 'string' && !USEFUL_DESCRIPTION_RE.test(description)) {
    return rest;
  }
  return node;
};

/**
 * Drops metadata the model does not need: the draft URI, display titles and
 * `additionalProperties: false`, which the prompt states once as a rule and
 * the zod validator enforces anyway. Only metadata-shaped values are removed,
 * so a chart property that happens to be named `title` is kept.
 */
const isSchemaMetadata = (key: string, value: unknown): boolean =>
  (key === '$schema' && typeof value === 'string') ||
  (key === 'title' && typeof value === 'string') ||
  (key === 'additionalProperties' && value === false);

const dropSchemaMetadata = (node: JsonSchemaNode): JsonSchemaNode =>
  Object.fromEntries(Object.entries(node).filter(([key, value]) => !isSchemaMetadata(key, value)));

const dropSystemOwnedProperties = (node: JsonSchemaNode): JsonSchemaNode => {
  const { properties, required } = node;
  if (!isSchemaNode(properties)) {
    return node;
  }
  const keptProperties = Object.fromEntries(
    Object.entries(properties).filter(([name]) => !SYSTEM_OWNED_PROPERTIES.includes(name))
  );
  const keptRequired = Array.isArray(required)
    ? required.filter((name) => !SYSTEM_OWNED_PROPERTIES.includes(name))
    : undefined;
  return {
    ...node,
    properties: keptProperties,
    ...(keptRequired ? { required: keptRequired } : {}),
  };
};

const collectDefRefs = (node: unknown, refs: Set<string>): void => {
  if (Array.isArray(node)) {
    node.forEach((item) => collectDefRefs(item, refs));
    return;
  }
  if (!isSchemaNode(node)) {
    return;
  }
  const { $ref } = node;
  if (typeof $ref === 'string' && $ref.startsWith(DEFS_REF_PREFIX)) {
    refs.add($ref.slice(DEFS_REF_PREFIX.length));
  }
  Object.values(node).forEach((value) => collectDefRefs(value, refs));
};

/**
 * Removes `$defs` entries no longer reachable from the schema root, e.g. the
 * filter definitions that only the dropped `filters` property referenced.
 */
const dropUnreachableDefs = (schema: JsonSchemaNode): JsonSchemaNode => {
  const { $defs, ...root } = schema;
  if (!isSchemaNode($defs)) {
    return schema;
  }
  const reachable = new Set<string>();
  const pending = new Set<string>();
  collectDefRefs(root, pending);
  while (pending.size > 0) {
    const [name] = pending;
    pending.delete(name);
    if (reachable.has(name)) {
      continue;
    }
    reachable.add(name);
    collectDefRefs($defs[name], pending);
  }
  const keptDefs = Object.fromEntries(
    Object.entries($defs).filter(([name]) => reachable.has(name))
  );
  return Object.keys(keptDefs).length > 0 ? { ...root, $defs: keptDefs } : root;
};

const toPromptSchema = (schema: z.ZodType): object => {
  const jsonSchema = mapSchemaNodes(z.toJSONSchema(schema), (node) =>
    dropSystemOwnedProperties(dropSchemaMetadata(trimDescription(node)))
  ) as JsonSchemaNode;
  return dropUnreachableDefs(jsonSchema);
};

const jsonSchemas = Object.fromEntries(
  Object.entries(chartTypeRegistry).map(([chartType, { schema }]) => [
    chartType,
    toPromptSchema(schema),
  ])
) as Record<SupportedChartType, object>;

export const getSchemaForChartType = (chartType: SupportedChartType): object =>
  jsonSchemas[chartType];
