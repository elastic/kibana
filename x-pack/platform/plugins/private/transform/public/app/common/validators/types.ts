/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A Validator function takes in a value to check and returns an array of error messages.
 * If no messages (empty array) get returned, the value is valid.
 *
 * Informal naming convention:
 * `is*()` is a plain check that returns a `boolean`
 * `*Validator()` implements this type and returns error messages.
 *
 * @param value The value to be validated
 * @param isOptional Optional boolean flag if the provided value is optional
 */
export type Validator = <T>(value: T, isOptional?: boolean) => string[];

/**
 * Interface for the parsed result of a duration string.
 */
export interface ParsedDuration {
  number: number;
  timeUnit: string;
}
