/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './dissect_patterns';
export * from './grok_patterns';
export * from './grok_to_regex';
export * from './painless_field_access';
export * from './painless_encoding';

import type { ZodObject, ZodRawShape } from '@kbn/zod';

// Utility type to rename multiple fields in a type
export type RenameFields<
  T,
  Renames extends { [K in keyof Renames]: K extends keyof T ? string : never }
> = Omit<T, keyof Renames> & {
  [K in keyof Renames as Renames[K]]: K extends keyof T ? T[K] : never;
};

export type RenameFieldsAndRemoveAction<
  T,
  Renames extends { [K in keyof Renames]: K extends keyof T ? string : never }
> = Omit<RenameFields<T, Renames>, 'action'>;

/**
 * Zod helper to rename multiple fields in a Zod object schema.
 */
export function zodRenameFields<T extends ZodObject<any>, Renames extends Record<string, string>>(
  schema: T,
  renames: Renames
): ZodObject<any> {
  // Remove old fields
  const newSchema = schema.omit(
    Object.keys(renames).reduce((acc, key) => ({ ...acc, [key]: true }), {} as Record<string, true>)
  );
  // Add new fields with the same type as the old ones
  const extensions: ZodRawShape = {};
  for (const oldKey in renames) {
    if (Object.prototype.hasOwnProperty.call(renames, oldKey)) {
      const newKey = renames[oldKey];
      extensions[newKey] = (schema.shape as any)[oldKey];
    }
  }
  return newSchema.extend(extensions);
}

/**
 * Zod helper to rename fields and remove the 'action' property.
 */
export function zodRenameFieldsAndRemoveAction<
  T extends ZodObject<any>,
  Renames extends Record<string, string>
>(schema: T, renames: Renames): ZodObject<any> {
  return zodRenameFields(schema, renames).omit({ action: true });
}
