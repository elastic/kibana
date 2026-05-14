/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import type { ParsedTemplateDefinitionSchema } from '../../../../common/types/domain/template/v1';
import { isRefField } from '../../../../common/types/domain/template/fields';
import type { Field } from '../../../../common/types/domain/template/fields';

type ParsedTemplateDefinition = z.infer<typeof ParsedTemplateDefinitionSchema>;

// Identity for merging: inline fields use `name`; `$ref` fields fall back to `$ref`
// when no local alias is provided.
const getFieldKey = (field: Field): string =>
  isRefField(field) ? field.name ?? field.$ref : field.name;

/**
 * Merge parent and child template definitions for single-level inheritance.
 * Parent fields come first; child fields with the same name override the parent.
 * The child's own metadata (name, description, tags, etc.) takes precedence.
 * The `extends` key is preserved from the child so the editor round-trip is intact.
 */
export const mergeTemplateDefinitions = (
  parent: ParsedTemplateDefinition,
  child: ParsedTemplateDefinition
): ParsedTemplateDefinition => {
  const merged = new Map<string, Field>();

  for (const field of parent.fields) {
    merged.set(getFieldKey(field), field);
  }
  for (const field of child.fields) {
    merged.set(getFieldKey(field), field);
  }

  return {
    ...child,
    fields: Array.from(merged.values()),
  };
};
