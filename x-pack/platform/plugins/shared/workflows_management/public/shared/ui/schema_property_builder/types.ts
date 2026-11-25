/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonSchema } from '@kbn/workflows/spec/schema/common/json_model_shape_schema';

/** Types the visual schema builder can author. */
export type SchemaPropertyType = 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';

/** One named property in the reusable inputs/outputs schema builder. */
export interface SchemaPropertyField {
  readonly id: string;
  readonly name: string;
  readonly type: SchemaPropertyType;
  readonly description: string;
  /** The caller must provide a value; independent of the default. */
  readonly required: boolean;
  /** A default is written (`default` in the schema); on, an empty `defaultValue` is the empty string. */
  readonly hasDefault: boolean;
  /** String form of the default; only meaningful when `hasDefault`. */
  readonly defaultValue: string;
  /** Allowed values for scalar types (maps to JSON Schema `enum` / `examples`). */
  readonly allowedValues: readonly string[];
  /** When true, allowed values are suggestions (`examples`); when false, a closed `enum`. */
  readonly allowOtherValues: boolean;
  /** Nested object properties (type === 'object'). */
  readonly properties?: readonly SchemaPropertyField[];
  /** Array item type (type === 'array'). */
  readonly itemType?: SchemaPropertyType;
  /**
   * Item schema read from the document when it is a union of scalar types (legacy `array` inputs), kept so
   * saving does not narrow it to strings. Dropped as soon as the item type is edited.
   */
  readonly itemSchema?: JsonSchema;
  /** Nested object shape when itemType === 'object'. */
  readonly itemProperties?: readonly SchemaPropertyField[];
}

/** `reserved`: a name that cannot be stored as an object key (`__proto__`). */
export type SchemaPropertyNameError = 'empty' | 'invalid' | 'duplicate' | 'reserved';

export const SCHEMA_PROPERTY_TYPE_OPTIONS: ReadonlyArray<{
  value: SchemaPropertyType;
  text: string;
}> = [
  { value: 'string', text: 'string' },
  { value: 'number', text: 'number' },
  { value: 'boolean', text: 'boolean' },
  { value: 'date', text: 'date' },
  { value: 'object', text: 'object' },
  { value: 'array', text: 'array' },
];

/** Scalars that support allowed-values lists. */
export const SCALAR_SCHEMA_PROPERTY_TYPES: ReadonlySet<SchemaPropertyType> = new Set([
  'string',
  'number',
  'boolean',
  'date',
]);

/** Max nesting depth for object/array-of-object property builders (root = 0). */
export const SCHEMA_PROPERTY_MAX_DEPTH = 2;
