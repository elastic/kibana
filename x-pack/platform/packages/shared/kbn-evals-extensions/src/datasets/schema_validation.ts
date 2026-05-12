/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validates a dataset example against a schema definition.
 *
 * This is a lightweight structural validator that checks:
 * - Required fields are present
 * - Field types match expected types
 * - No unknown fields (if strict mode is enabled)
 */
export const validateExample = (
  example: Record<string, unknown>,
  schema: ExampleSchema,
  options?: { strict?: boolean }
): ValidationResult => {
  const errors: ValidationError[] = [];

  // Check required fields
  for (const field of schema.required ?? []) {
    if (!(field in example)) {
      errors.push({ path: field, message: `Required field "${field}" is missing` });
    }
  }

  // Check field types
  for (const [field, expectedType] of Object.entries(schema.fields ?? {})) {
    if (field in example) {
      const actualType = Array.isArray(example[field]) ? 'array' : typeof example[field];
      if (actualType !== expectedType && example[field] !== null) {
        errors.push({
          path: field,
          message: `Field "${field}" expected type "${expectedType}" but got "${actualType}"`,
        });
      }
    }
  }

  // Strict mode: check for unknown fields
  if (options?.strict && schema.fields) {
    const knownFields = new Set(Object.keys(schema.fields));
    for (const field of Object.keys(example)) {
      if (!knownFields.has(field)) {
        errors.push({
          path: field,
          message: `Unknown field "${field}" not in schema`,
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Validates an entire dataset.
 */
export const validateDataset = (
  examples: Array<Record<string, unknown>>,
  schema: ExampleSchema,
  options?: { strict?: boolean }
): DatasetValidationResult => {
  const exampleErrors: Array<{ index: number; errors: ValidationError[] }> = [];

  for (let i = 0; i < examples.length; i++) {
    const result = validateExample(examples[i], schema, options);
    if (!result.valid) {
      exampleErrors.push({ index: i, errors: result.errors });
    }
  }

  return {
    valid: exampleErrors.length === 0,
    totalExamples: examples.length,
    invalidExamples: exampleErrors.length,
    errors: exampleErrors,
  };
};

export interface ExampleSchema {
  required?: string[];
  fields?: Record<string, 'string' | 'number' | 'boolean' | 'object' | 'array'>;
}

export interface DatasetValidationResult {
  valid: boolean;
  totalExamples: number;
  invalidExamples: number;
  errors: Array<{ index: number; errors: ValidationError[] }>;
}
