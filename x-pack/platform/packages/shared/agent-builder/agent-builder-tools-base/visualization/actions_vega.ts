/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlEsqlColumnInfo } from '@elastic/elasticsearch/lib/api/types';

/** Action recording the ES|QL query that backs the Vega visualization. */
export interface GenerateVegaEsqlAction {
  type: 'generate_esql';
  success: boolean;
  query?: string;
  /** Result columns of the executed query, used to inform spec authoring. */
  columns?: EsqlEsqlColumnInfo[];
  error?: string;
}

/** Action recording a Vega spec generation attempt (pre-validation). */
export interface GenerateVegaSpecAction {
  type: 'generate_spec';
  success: boolean;
  /** Parsed spec object, validated by the following validate_spec action. */
  spec?: Record<string, unknown>;
  attempt: number;
  error?: string;
}

/** Action recording the outcome of validating a generated Vega spec. */
export interface ValidateVegaSpecAction {
  type: 'validate_spec';
  success: boolean;
  /** The finalized spec, serialized as the string the Vega embeddable expects. */
  spec?: string;
  attempt: number;
  error?: string;
}

export type VegaAction = GenerateVegaEsqlAction | GenerateVegaSpecAction | ValidateVegaSpecAction;

export const isGenerateVegaSpecAction = (action: VegaAction): action is GenerateVegaSpecAction =>
  action.type === 'generate_spec';

export const isValidateVegaSpecAction = (action: VegaAction): action is ValidateVegaSpecAction =>
  action.type === 'validate_spec';

// Node name constants
export const GENERATE_VEGA_ESQL_NODE = 'generate_esql_query';
export const GENERATE_VEGA_SPEC_NODE = 'generate_spec';
export const VALIDATE_VEGA_SPEC_NODE = 'validate_spec';

// Configuration constants
export const MAX_VEGA_RETRY_ATTEMPTS = 5;
