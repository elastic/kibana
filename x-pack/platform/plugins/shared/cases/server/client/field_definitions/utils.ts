/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseYaml } from 'yaml';
import { InlineFieldSchema } from '../../../common/types/domain/template/fields';

/**
 * A field definition's persisted identity: the YAML `name` and storage `type`.
 * Together they form the `${name}_as_${type}` key under which case values are
 * stored in `extended_fields` and surfaced in Cases analytics.
 */
export interface FieldDefinitionIdentity {
  name: string;
  type: string;
}

/**
 * Extracts the identity from a field-definition YAML string. Returns
 * `undefined` when the YAML does not parse into a known inline field shape
 * (e.g. malformed legacy or imported definitions) — callers decide whether to
 * defer to full definition validation or skip identity comparison.
 */
export const parseFieldDefinitionIdentity = (
  definition: string
): FieldDefinitionIdentity | undefined => {
  try {
    const parsed = InlineFieldSchema.safeParse(parseYaml(definition));
    if (!parsed.success) {
      return undefined;
    }
    return { name: parsed.data.name, type: parsed.data.type };
  } catch {
    return undefined;
  }
};
