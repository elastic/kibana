/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { getMeta, setMeta } from './schema_connector_metadata';

interface HasUnwrap {
  unwrap(): z.ZodType;
}

const isUnwrappable = (schema: z.ZodType): schema is z.ZodType & HasUnwrap => {
  return (
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodNullable ||
    schema instanceof z.ZodDefault ||
    schema instanceof z.ZodCatch ||
    schema instanceof z.ZodReadonly
  );
};

/* Some schemas are wrapped (e.g., with ZodOptional or ZodDefault), so we unwrap them to get the underlying schema
 * In the process, we also extract the default value if any
 * @param schema - The Zod schema to extract from
 * @returns An object containing the unwrapped schema and any default value
 */
export const extractSchemaCore = (schema: z.ZodType) => {
  let current = schema;
  let defaultValue: unknown;
  let isOptional = false;

  while (isUnwrappable(current)) {
    if (current instanceof z.ZodDefault) {
      defaultValue = current.parse(undefined);
    }

    if (current instanceof z.ZodOptional) {
      isOptional = true;
    }

    const wrapperMeta = getMeta(current);
    let nextSchema: z.ZodType;
    let extraMeta = {};

    if (current instanceof z.ZodReadonly) {
      // Readonly had no unwarp fn until v4.0.6
      // https://github.com/colinhacks/zod/issues/4951
      // This if statement can be removed when we upgrade
      nextSchema = current.def.innerType as z.ZodType;
      extraMeta = { disabled: true };
    } else {
      nextSchema = current.unwrap();
    }

    const mergedMeta = {
      ...wrapperMeta,
      ...getMeta(nextSchema),
      ...extraMeta,
    };

    setMeta(nextSchema, mergedMeta);
    current = nextSchema;
  }

  // If the schema is a literal, we need it as defaultValue
  if (current instanceof z.ZodLiteral) {
    defaultValue = current.value;
  }

  return { schema: current, defaultValue, isOptional };
};
