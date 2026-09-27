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

const isBareLiteral = (branch: unknown): branch is { type: string; const: unknown } =>
  isSchemaNode(branch) &&
  typeof branch.type === 'string' &&
  'const' in branch &&
  Object.keys(branch).every((key) => key === 'type' || key === 'const');

/**
 * Rewrites `anyOf`/`oneOf` unions of same-typed bare literals, which zod emits
 * for `z.union([z.literal(...)])`, as a single `enum`.
 */
const collapseLiteralUnions = (node: JsonSchemaNode): JsonSchemaNode => {
  const unionKey = (['anyOf', 'oneOf'] as const).find((key) => Array.isArray(node[key]));
  if (!unionKey) {
    return node;
  }
  const branches = node[unionKey] as unknown[];
  const [first] = branches;
  if (
    branches.length < 2 ||
    !isBareLiteral(first) ||
    !branches.every((branch) => isBareLiteral(branch) && branch.type === first.type)
  ) {
    return node;
  }
  const { [unionKey]: dropped, ...rest } = node;
  return {
    ...rest,
    type: first.type,
    enum: branches.map((branch) => (branch as { const: unknown }).const),
  };
};

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

const getDefName = (node: JsonSchemaNode): string | undefined => {
  const { $ref } = node;
  return typeof $ref === 'string' && $ref.startsWith(DEFS_REF_PREFIX)
    ? $ref.slice(DEFS_REF_PREFIX.length)
    : undefined;
};

const forEachDefRef = (node: unknown, onRef: (name: string) => void): void => {
  if (Array.isArray(node)) {
    node.forEach((item) => forEachDefRef(item, onRef));
    return;
  }
  if (!isSchemaNode(node)) {
    return;
  }
  const name = getDefName(node);
  if (name) {
    onRef(name);
  }
  Object.values(node).forEach((value) => forEachDefRef(value, onRef));
};

const collectDefRefs = (node: unknown, refs: Set<string>): void =>
  forEachDefRef(node, (name) => refs.add(name));

/**
 * Replaces `$ref`s to definitions used exactly once with the definition
 * itself, since the indirection then costs more than it saves. Sibling keys
 * on the referencing node (e.g. a description) take precedence. A single-use
 * definition cannot take part in a reference cycle, so inlining terminates.
 */
const inlineSingleUseDefs = (schema: JsonSchemaNode): JsonSchemaNode => {
  const { $defs, ...root } = schema;
  if (!isSchemaNode($defs)) {
    return schema;
  }
  const refCounts = new Map<string, number>();
  forEachDefRef(schema, (name) => refCounts.set(name, (refCounts.get(name) ?? 0) + 1));
  const singleUse = new Set(
    Object.keys($defs).filter((name) => refCounts.get(name) === 1 && isSchemaNode($defs[name]))
  );

  const inline = (node: unknown): unknown => {
    if (Array.isArray(node)) {
      return node.map(inline);
    }
    if (!isSchemaNode(node)) {
      return node;
    }
    const name = getDefName(node);
    if (name && singleUse.has(name)) {
      const { $ref, ...overrides } = node;
      return inline({ ...($defs[name] as JsonSchemaNode), ...overrides });
    }
    return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, inline(value)]));
  };

  const keptDefs = Object.fromEntries(
    Object.entries($defs)
      .filter(([name]) => !singleUse.has(name))
      .map(([name, def]) => [name, inline(def)])
  );
  const inlinedRoot = inline(root) as JsonSchemaNode;
  return Object.keys(keptDefs).length > 0 ? { ...inlinedRoot, $defs: keptDefs } : inlinedRoot;
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

/**
 * The model authors the *input* of the zod schema, so emit that side:
 * in output mode zod lists every `.default()` field as required, which
 * made the model restate defaults such as `sampling` on every layer.
 */
const toPromptSchema = (schema: z.ZodType): object => {
  const jsonSchema = mapSchemaNodes(z.toJSONSchema(schema, { io: 'input' }), (node) =>
    dropSystemOwnedProperties(collapseLiteralUnions(dropSchemaMetadata(trimDescription(node))))
  ) as JsonSchemaNode;
  return inlineSingleUseDefs(dropUnreachableDefs(jsonSchema));
};

const jsonSchemas = Object.fromEntries(
  Object.entries(chartTypeRegistry).map(([chartType, { schema }]) => [
    chartType,
    toPromptSchema(schema),
  ])
) as Record<SupportedChartType, object>;

export const getSchemaForChartType = (chartType: SupportedChartType): object =>
  jsonSchemas[chartType];
