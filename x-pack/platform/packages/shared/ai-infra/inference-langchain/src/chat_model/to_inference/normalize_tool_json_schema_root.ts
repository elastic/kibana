/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Zod → JSON Schema often emits top-level `allOf` (e.g. `z.intersection`) or `oneOf` /
 * `anyOf` (e.g. `z.discriminatedUnion`) **without** `type: "object"`. Downstream code
 * historically used `lodash/pick(..., ['type','properties','required'])`, which drops
 * those keywords and yields schemas Bedrock Converse rejects ("inputSchema.json.type
 * must be ... object"). Normalize to a single object schema at the root when possible.
 */
function isPlainObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeAllOfObjectBranches(fragments: unknown[]): Record<string, unknown> | null {
  const mergedProps: Record<string, unknown> = {};
  const requiredKeys = new Set<string>();

  for (const fragment of fragments) {
    if (!isPlainObjectRecord(fragment)) {
      return null;
    }
    if (fragment.type !== 'object' || !isPlainObjectRecord(fragment.properties)) {
      return null;
    }
    Object.assign(mergedProps, fragment.properties);
    if (Array.isArray(fragment.required)) {
      for (const r of fragment.required) {
        if (typeof r === 'string') {
          requiredKeys.add(r);
        }
      }
    }
  }

  const out: Record<string, unknown> = {
    type: 'object',
    properties: mergedProps,
  };
  if (requiredKeys.size > 0) {
    out.required = [...requiredKeys];
  }
  return out;
}

function mergeConstEnumPropertySchemas(
  existing: unknown,
  incoming: unknown
): Record<string, unknown> | null {
  if (!isPlainObjectRecord(existing) || !isPlainObjectRecord(incoming)) {
    return null;
  }
  const collectStringLiterals = (node: Record<string, unknown>): string[] => {
    if (typeof node.const === 'string') {
      return [node.const];
    }
    if (Array.isArray(node.enum) && node.enum.every((x) => typeof x === 'string')) {
      return node.enum as string[];
    }
    return [];
  };

  const a = collectStringLiterals(existing);
  const b = collectStringLiterals(incoming);
  if (a.length === 0 && b.length === 0) {
    return null;
  }
  const merged = Array.from(new Set([...a, ...b]));
  if (merged.length === 0) {
    return null;
  }
  if (merged.length === 1) {
    return { type: 'string', const: merged[0] };
  }
  return { type: 'string', enum: merged };
}

function mergeOneOfLikeObjectBranches(branches: unknown[]): Record<string, unknown> | null {
  const objectBranches: Record<string, unknown>[] = [];
  for (const b of branches) {
    if (!isPlainObjectRecord(b)) {
      return null;
    }
    if (b.type !== 'object' || !isPlainObjectRecord(b.properties)) {
      return null;
    }
    objectBranches.push(b);
  }
  if (objectBranches.length === 0) {
    return null;
  }

  const mergedProps: Record<string, unknown> = {};
  for (const b of objectBranches) {
    const branchProps = b.properties as Record<string, unknown>;
    for (const [key, propSchema] of Object.entries(branchProps)) {
      const existing = mergedProps[key];
      if (existing === undefined) {
        mergedProps[key] = propSchema;
        continue;
      }
      const mergedLiteral = mergeConstEnumPropertySchemas(existing, propSchema);
      if (mergedLiteral) {
        mergedProps[key] = mergedLiteral;
      }
    }
  }

  const reqSets = objectBranches.map((branch) => {
    if (!Array.isArray(branch.required)) {
      return new Set<string>();
    }
    return new Set(
      (branch.required as unknown[]).filter((x): x is string => typeof x === 'string')
    );
  });

  let intersection: string[] = [];
  if (reqSets.length > 0) {
    const first = reqSets[0]!;
    intersection = [...first].filter((key) => reqSets.every((s) => s.has(key)));
  }

  const out: Record<string, unknown> = {
    type: 'object',
    properties: mergedProps,
  };
  if (intersection.length > 0) {
    out.required = intersection;
  }
  return out;
}

export function normalizeRootJsonSchemaForToolInput(full: unknown): Record<string, unknown> {
  if (!isPlainObjectRecord(full)) {
    return { type: 'object', properties: {} };
  }
  if (full.type === 'object') {
    return full;
  }
  if (Array.isArray(full.allOf)) {
    const merged = mergeAllOfObjectBranches(full.allOf);
    if (merged) {
      return merged;
    }
  }
  if (Array.isArray(full.oneOf)) {
    const merged = mergeOneOfLikeObjectBranches(full.oneOf);
    if (merged) {
      return merged;
    }
  }
  if (Array.isArray(full.anyOf)) {
    const merged = mergeOneOfLikeObjectBranches(full.anyOf);
    if (merged) {
      return merged;
    }
  }
  return full;
}
