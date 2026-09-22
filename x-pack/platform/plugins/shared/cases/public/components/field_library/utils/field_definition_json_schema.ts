/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { InlineFieldSchema } from '../../../../common/types/domain/template/fields';
import { applyFieldSchemaOverrides } from '../../templates_v2/utils/template_json_schema';
import { INLINE_FIELD_DEFAULT_SNIPPETS } from '../../templates_v2/utils/template_field_snippets';

export const FIELD_DEFINITION_SCHEMA_URI = 'file:///cases-field-definition-schema.json';

/**
 * Generates the Monaco editor JSON Schema for a standalone field-library definition. The document
 * root is a single inline field — the same shapes a template's `fields` entries accept, minus
 * `$ref` (the library stores concrete field definitions, not references to other fields), which
 * `InlineFieldSchema` already excludes. The override pipeline and scaffold snippets are shared
 * with the template editor so both editors autocomplete and validate identically.
 */
export const getFieldDefinitionJsonSchema = (): z.core.JSONSchema.JSONSchema | null => {
  try {
    const schema = z.toJSONSchema(InlineFieldSchema, {
      target: 'draft-7',
      unrepresentable: 'any',
      reused: 'inline',
      override: applyFieldSchemaOverrides,
    });
    // Root-level defaultSnippets give the same "pick a field type" scaffold menu as the template
    // editor's `fields` entries, just at the document root.
    (schema as Record<string, unknown>).defaultSnippets = INLINE_FIELD_DEFAULT_SNIPPETS;
    return schema;
  } catch {
    return null;
  }
};
