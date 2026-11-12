/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';

interface IntrospectedDef {
  type: string;
  shape?: Record<string, z.ZodType>;
  innerType?: z.ZodType;
}

const defOf = (schema: z.core.SomeType): IntrospectedDef => schema._zod.def as IntrospectedDef;

const isWrapper = (type: string): boolean =>
  type === 'optional' || type === 'nullable' || type === 'default';

/** Strips `optional`/`nullable`/`default` wrappers to reach the schema that decides the merge. */
const unwrap = (schema: z.ZodType): z.ZodType => {
  let current = schema;
  while (isWrapper(defOf(current).type)) {
    const { innerType } = defOf(current);
    if (!innerType) break;
    current = innerType;
  }
  return current;
};

/**
 * Merges a PATCH body into an existing document using the create schema to decide how deep to go:
 * object leaves merge independently, arrays and unions are replaced whole, `null` clears a key and
 * absent keys preserve it. The result never contains `null`, so cleared keys are simply gone.
 *
 * An object left with no keys is cleared along with them, innermost first, because `{}` is not a
 * value the create schemas accept: clearing the last leaf of a matcher clears the whole block
 * rather than failing validation.
 *
 * Shared by the rules and action policy clients so the two resources cannot disagree about what a
 * PATCH means. The result is a candidate document, not a validated one — parse it with the create
 * schema before storing it.
 */
export const applyPatch = (
  schema: z.ZodObject<z.core.$ZodShape>,
  existing: Record<string, unknown> | undefined,
  patch: Record<string, unknown>
): Record<string, unknown> => {
  const { shape } = defOf(schema);
  const merged: Record<string, unknown> = { ...existing };

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;

    if (value === null) {
      delete merged[key];
      continue;
    }

    const field = shape?.[key];
    const core = field && unwrap(field);

    if (core && defOf(core).type === 'object') {
      const nested = applyPatch(
        core as z.ZodObject<z.core.$ZodShape>,
        merged[key] as Record<string, unknown> | undefined,
        value as Record<string, unknown>
      );

      if (Object.keys(nested).length === 0) delete merged[key];
      else merged[key] = nested;
      continue;
    }

    merged[key] = value;
  }

  return merged;
};
