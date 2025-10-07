/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MapConfig } from './types';

export interface ExploreDataViewsAction {
  type: 'explore_dataviews';
  success: boolean;
  requestId: string; // Unique identifier for this request
  description: string; // What data views to look for
  resources?: Array<{ id: string; title: string; reason?: string }>; // Found data views
  error?: string;
}

export interface RequestDataViewsAction {
  type: 'request_dataviews';
  requestId: string; // Unique identifier for this request
  description: string; // What data views to look for
  pattern?: string; // Optional pattern to filter data views by title
  limit?: number; // Max number of data views to return
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
  needsDataViews?: RequestDataViewsAction; // If set, LLM is requesting data view exploration
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
  | ExploreDataViewsAction
  | RequestDataViewsAction
  | GenerateEsqlAction
  | RequestEsqlAction
  | GenerateConfigAction
  | ValidateConfigAction;

export function isExploreDataViewsAction(action: Action): action is ExploreDataViewsAction {
  return action.type === 'explore_dataviews';
}

export function isRequestDataViewsAction(action: Action): action is RequestDataViewsAction {
  return action.type === 'request_dataviews';
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
export const EXPLORE_DATAVIEWS_NODE = 'explore_dataviews';
export const GENERATE_ESQL_NODE = 'generate_esql';
export const GENERATE_CONFIG_NODE = 'generate_config';
export const VALIDATE_CONFIG_NODE = 'validate_config';

// Configuration constants
export const MAX_RETRY_ATTEMPTS = 5;
