/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type SourceType = 'esql' | 'connector';

export interface SelectedSource {
  type: SourceType;
  /** Stable identifier, unique within a source type (e.g. the ES|QL query). */
  id: string;
  /** Human-readable label rendered in the selected-source chips. */
  label: string;
  /** Underlying source value sent to the AI index API (e.g. the ES|QL query). */
  value: string;
}
