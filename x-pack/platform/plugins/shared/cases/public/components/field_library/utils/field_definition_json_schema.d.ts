import { z } from '@kbn/zod/v4';
export declare const FIELD_DEFINITION_SCHEMA_URI = "file:///cases-field-definition-schema.json";
/**
 * Generates the Monaco editor JSON Schema for a standalone field-library definition. The document
 * root is a single inline field — the same shapes a template's `fields` entries accept, minus
 * `$ref` (the library stores concrete field definitions, not references to other fields), which
 * `InlineFieldSchema` already excludes. The override pipeline and scaffold snippets are shared
 * with the template editor so both editors autocomplete and validate identically.
 */
export declare const getFieldDefinitionJsonSchema: () => z.core.JSONSchema.JSONSchema | null;
