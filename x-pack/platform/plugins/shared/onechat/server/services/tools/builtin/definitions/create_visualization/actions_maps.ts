/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MapConfig } from './types';

export interface ExploreIndicesAction {
  type: 'explore_indices';
  success: boolean;
  requestId: string; // Unique identifier for this request
  description: string; // What indices to look for
  resources?: Array<{ type: string; name: string; reason?: string }>; // Found indices
  error?: string;
}

export interface RequestIndicesAction {
  type: 'request_indices';
  requestId: string; // Unique identifier for this request
  description: string; // What indices to look for
  indexPattern?: string; // Optional index pattern filter
  limit?: number; // Max number of indices to return
  attempt: number;
}

export interface GenerateEsqlAction {
  type: 'generate_esql';
  success: boolean;
  query?: string;
  queryId: string; // Unique identifier for this query
  description: string; // What this query is for
  error?: string;
}

export interface RequestEsqlAction {
  type: 'request_esql';
  queryId: string; // Unique identifier for this query request
  description: string; // What this query is for
  attempt: number;
}

export interface GenerateConfigAction {
  type: 'generate_config';
  success: boolean;
  config?: any; // Can be any shape - gets validated in ValidateConfigAction
  needsEsql?: RequestEsqlAction; // If set, LLM is requesting ES|QL generation
  needsIndices?: RequestIndicesAction; // If set, LLM is requesting index exploration
  attempt: number;
  error?: string;
}

export interface ValidateConfigAction {
  type: 'validate_config';
  success: boolean;
  config?: MapConfig;
  attempt: number;
  error?: string;
}

export type Action =
  | ExploreIndicesAction
  | RequestIndicesAction
  | GenerateEsqlAction
  | RequestEsqlAction
  | GenerateConfigAction
  | ValidateConfigAction;

export function isExploreIndicesAction(action: Action): action is ExploreIndicesAction {
  return action.type === 'explore_indices';
}

export function isRequestIndicesAction(action: Action): action is RequestIndicesAction {
  return action.type === 'request_indices';
}

export function isGenerateEsqlAction(action: Action): action is GenerateEsqlAction {
  return action.type === 'generate_esql';
}

export function isRequestEsqlAction(action: Action): action is RequestEsqlAction {
  return action.type === 'request_esql';
}

export function isGenerateConfigAction(action: Action): action is GenerateConfigAction {
  return action.type === 'generate_config';
}

export function isValidateConfigAction(action: Action): action is ValidateConfigAction {
  return action.type === 'validate_config';
}

// Node name constants
export const EXPLORE_INDICES_NODE = 'explore_indices';
export const GENERATE_ESQL_NODE = 'generate_esql';
export const GENERATE_CONFIG_NODE = 'generate_config';
export const VALIDATE_CONFIG_NODE = 'validate_config';

// Configuration constants
export const MAX_RETRY_ATTEMPTS = 5;
