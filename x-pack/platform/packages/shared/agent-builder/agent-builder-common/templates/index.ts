/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A nested object value for OBJECT / OBJECT_ARRAY fields.
 * The interface is recursive to allow arbitrary nesting depth.
 */
export interface MetadataObjectValue {
  [key: string]: MetadataFieldValue;
}

/**
 * A metadata value as callers and the LLM supply it — before serialization to ES `flattened`.
 *
 * OBJECT and OBJECT_ARRAY values are passed through without coercion (stored as-is).
 * All other types are serialized to string/string[] on write and coerced back on read.
 */
export type MetadataFieldValue =
  | string
  | string[]
  | number
  | boolean
  | MetadataObjectValue
  | MetadataObjectValue[];

/**
 * A metadata value as persisted in the ES `flattened` field.
 *
 * Scalars (TEXT, NUMBER, TOGGLE, DATE, SELECT, USER) are stored as strings.
 * TEXT_ARRAY is stored as string[].
 * OBJECT is stored as a plain JSON object (all leaves become flattened keywords).
 * OBJECT_ARRAY is stored as an array of plain JSON objects.
 */
export type SerializedMetadataValue =
  | string
  | string[]
  | MetadataObjectValue
  | MetadataObjectValue[];

/**
 * The authoring type that governs what a user/agent supplies for a field.
 *
 * Maps to Elasticsearch storage types through serialization:
 *   TEXT_ARRAY   → string[]  (flattened keyword array)
 *   TOGGLE       → "true"/"false" string
 *   NUMBER       → numeric string
 *   DATE         → ISO 8601 string
 *   USER         → plain string (profile uid or username)
 *   SELECT       → exact string from `options`
 *   TEXT         → string
 *   OBJECT       → stored as-is (raw JSON object, preserved verbatim in `_source`)
 *   OBJECT_ARRAY → stored as-is (raw JSON array of objects, preserved verbatim in `_source`)
 *
 * Note: OBJECT and OBJECT_ARRAY values are never serialized or deserialized — the raw
 * JSON is written to and read from ES unchanged. Under the `flattened` mapping every leaf
 * is indexed as a keyword regardless of its JSON type, so coercion would add no query
 * benefit and would silently corrupt nested booleans and numbers.
 */
export type ConversationTemplateInputType =
  | 'SELECT'
  | 'TEXT'
  | 'NUMBER'
  | 'DATE'
  | 'TOGGLE'
  | 'TEXT_ARRAY'
  | 'USER'
  | 'OBJECT'
  | 'OBJECT_ARRAY';

export interface ConversationTemplateFieldDefinition {
  input_type: ConversationTemplateInputType;
  /**
   * Human-readable hint shown to the LLM in the system prompt and, in future, in the UI.
   * Describes what value is expected for this field.
   */
  description?: string;
  /**
   * Initial value seeded into `metadata` when the template is applied.
   * For TEXT_ARRAY fields this must be an array of strings.
   * For TOGGLE fields this must be a boolean.
   * For NUMBER fields this may be a number or a numeric string.
   */
  default_value?: MetadataFieldValue;
  /** When true, the field must be non-empty on every metadata write. */
  required?: boolean;
  /** SELECT only — the exhaustive set of accepted values. */
  options?: string[];
  /** TEXT / TEXT_ARRAY — maximum string length for the value (or per item for TEXT_ARRAY). */
  max_length?: number;
  /** NUMBER only — lower bound. */
  min?: number;
  /** NUMBER only — upper bound. */
  max?: number;
  /** TEXT / SELECT — value must match this regex pattern. */
  regex?: { pattern: string; message?: string };
  /**
   * OBJECT / OBJECT_ARRAY only — the schema of each object's properties, recursively.
   * Required for OBJECT and OBJECT_ARRAY; invalid for all other input types.
   *
   * Each entry is a full field definition, allowing unlimited nesting depth up to the
   * server-enforced cap (MAX_OBJECT_DEPTH = 5). Nested definitions do not support
   * `default_value` — defaults are a top-level concept only.
   */
  properties?: Record<string, ConversationTemplateFieldDefinition>;
  /**
   * OBJECT_ARRAY only — maximum number of elements in the array.
   * Invalid for all other input types.
   */
  max_items?: number;
}

/**
 * A user-authored (or code-registered) conversation template.
 *
 * `fields` is a plain object — insertion order is significant and preserved by both the
 * JS runtime and ES `_source` round-trips. The UI renders fields in declaration order.
 */
export interface ConversationTemplate {
  id: string;
  version: number;
  name: string;
  description?: string;
  /**
   * Named field definitions, keyed by the metadata key they govern.
   * Do not use integer-like keys — insertion order is only guaranteed for string keys.
   */
  fields: Record<string, ConversationTemplateFieldDefinition>;
}
