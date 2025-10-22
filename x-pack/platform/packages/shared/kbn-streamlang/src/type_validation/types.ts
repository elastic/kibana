/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Primitive types supported by the type system.
 * These are the only concrete types that fields can have.
 */
export type PrimitiveType = 'string' | 'number' | 'boolean' | 'date';

/**
 * Placeholder type for unknown fields.
 * Format: "typeof_<fieldname>" or "typeof_<field1>,<field2>,..." for merged placeholders
 */
export type TypeofPlaceholder = `typeof_${string}`;

/**
 * Union of all possible field types.
 */
export type FieldType = PrimitiveType | TypeofPlaceholder;

/**
 * Records an assumption made during validation.
 * Assumptions are made when typeof placeholders are assigned to concrete types
 * or when typeof placeholders are merged together.
 */
export interface TypeAssumption {
  /** The placeholder this assumption is about */
  placeholder: TypeofPlaceholder;
  /** What type we're assuming it to be */
  assumedType: PrimitiveType | TypeofPlaceholder;
  /** Human-readable reason for this assumption */
  reason: string;
}

/**
 * Information about a single type assignment to a field.
 */
export interface TypeAssignment {
  /** The type assigned */
  type: FieldType;
  /** Index of the processor that made this assignment */
  processorIndex: number;
  /** Whether this assignment happened inside a conditional block */
  isConditional: boolean;
}

/**
 * Tracks all type information for a single field.
 */
export interface FieldTypeInfo {
  /** Current type of the field */
  currentType: FieldType;
  /** All assignments made to this field (for detecting conditional type changes) */
  allAssignments: TypeAssignment[];
}

/**
 * State tracking types of all fields.
 * Maps field names to their type information.
 */
export type TypeState = Map<string, FieldTypeInfo>;
