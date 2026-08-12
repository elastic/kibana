/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The authoring type that governs what a user/agent supplies for a field.
 *
 * Maps to Elasticsearch storage types through serialization:
 *   TEXT_ARRAY → string[]  (flattened keyword array)
 *   TOGGLE     → "true"/"false" string
 *   NUMBER     → numeric string
 *   DATE       → ISO 8601 string
 *   USER       → plain string (profile uid or username)
 *   SELECT     → exact string from `options`
 *   TEXT       → string
 */
export type ConversationTemplateInputType =
  | 'SELECT'
  | 'TEXT'
  | 'NUMBER'
  | 'DATE'
  | 'TOGGLE'
  | 'TEXT_ARRAY'
  | 'USER';

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
  default_value?: string | string[] | number | boolean;
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
}

/**
 * A user-authored (or code-registered) conversation template.
 *
 * `fields` is a plain object — insertion order is significant and is preserved
 * by both the JS runtime and Elasticsearch `_source` round-trips. The UI must
 * render fields in the order they appear here (RFC success criteria).
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
