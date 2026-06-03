/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CREATE_VEGA_VISUALIZATION_FAILURE_TYPES = {
  invalidJson: 'invalid_json',
  missingSchema: 'missing_schema',
  persistence: 'persistence',
} as const;

export type CreateVegaVisualizationFailureType =
  (typeof CREATE_VEGA_VISUALIZATION_FAILURE_TYPES)[keyof typeof CREATE_VEGA_VISUALIZATION_FAILURE_TYPES];

export interface CreateVegaVisualizationFailure {
  type: CreateVegaVisualizationFailureType;
  message: string;
  /** JSON pointer-style path to the offending spec node, if available. */
  path?: string;
}
