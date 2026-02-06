/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Supported field types for type tracking
 */
export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'unknown';

/**
 * Map of field names to their inferred types
 */
export type FieldTypeMap = Map<string, FieldType>;

export interface StreamlangValidationError {
  type:
    | 'non_namespaced_field'
    | 'reserved_field'
    | 'type_mismatch'
    | 'mixed_type'
    | 'invalid_value'
    | 'invalid_field_name'
    | 'forbidden_processor'
    | 'invalid_processor_placement';
  message: string;
  processorId?: string;
  field: string;
  expectedType?: FieldType | FieldType[];
  actualType?: FieldType;
  conflictingTypes?: FieldType[];
}

export interface StreamlangValidationOptions {
  /**
   * List of reserved/forbidden field names that cannot be modified by processors
   */
  reservedFields: string[];
  streamType: 'classic' | 'wired';
}

export interface StreamlangValidationResult {
  isValid: boolean;
  errors: StreamlangValidationError[];
  /**
   * Field types available at each processor (indexed by processorId).
   * This represents the field types that exist BEFORE the processor runs,
   * which is useful for field selection in the UI.
   */
  fieldTypesByProcessor: Map<string, FieldTypeMap>;
}
