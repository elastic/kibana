/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Represents a path to a field as an array of string segments.
 * Each element in the array represents a level in the field hierarchy.
 *
 * A segment might contain a character that is invalid in some contexts.
 * @example ['person', 'address', 'street-level']
 */
export type FieldPath = string[];

/**
 * Converts a FieldPath array into a string useable as the field in the ingest pipeline.
 *
 * @param fieldPath - The array of field names representing the path.
 * @returns The processor string created by joining the field names with a dot.
 */
export function fieldPathToProcessorString(fieldPath: FieldPath): string {
  return fieldPath.join('.');
}
