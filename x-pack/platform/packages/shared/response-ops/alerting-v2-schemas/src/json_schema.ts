/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inlineRootJsonSchemaRef, normalizeJsonSchemaTypeArrays, z } from '@kbn/zod/v4';

type ToJsonSchemaOptions = NonNullable<Parameters<typeof z.toJSONSchema>[1]>;

const jsonPointerUnescape = (segment: string): string =>
  segment.replace(/~1/g, '/').replace(/~0/g, '~');

const dropInlinedRootDefinition = (
  schema: Record<string, unknown>,
  rootRef: string | undefined
): Record<string, unknown> => {
  if (typeof rootRef !== 'string') {
    return schema;
  }

  const defsMatch = rootRef.match(/^#\/\$defs\/(.+)$/);
  if (defsMatch && schema.$defs !== null && typeof schema.$defs === 'object') {
    const name = jsonPointerUnescape(defsMatch[1]);
    const { [name]: _removed, ...defs } = schema.$defs as Record<string, unknown>;
    return { ...schema, $defs: defs };
  }

  const definitionsMatch = rootRef.match(/^#\/definitions\/(.+)$/);
  if (definitionsMatch && schema.definitions !== null && typeof schema.definitions === 'object') {
    const name = jsonPointerUnescape(definitionsMatch[1]);
    const { [name]: _removed, ...definitions } = schema.definitions as Record<string, unknown>;
    return { ...schema, definitions };
  }

  return schema;
};

/**
 * Converts alerting v2 Zod schemas to JSON Schema for editors and docs.
 * Inlines a root `.meta({ id })` `$ref` and normalizes zod >= 4.5 `type` arrays.
 */
export const toAlertingV2JsonSchema = (
  schema: z.ZodType,
  options: ToJsonSchemaOptions = {}
): Record<string, unknown> => {
  const { $schema: _schema, ...rest } = z.toJSONSchema(schema, {
    target: 'draft-7',
    unrepresentable: 'any',
    ...options,
  }) as Record<string, unknown>;

  const rootRef = typeof rest.$ref === 'string' ? rest.$ref : undefined;
  const inlined = inlineRootJsonSchemaRef(rest);
  const withoutDuplicateRootDef = dropInlinedRootDefinition(inlined, rootRef);
  return normalizeJsonSchemaTypeArrays(withoutDuplicateRootDef);
};
