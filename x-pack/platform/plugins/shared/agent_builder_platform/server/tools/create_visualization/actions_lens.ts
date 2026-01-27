/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VisualizationConfig } from './types';

export interface GenerateEsqlAction {
  type: 'generate_esql';
  success: boolean;
  query?: string;
  error?: string;
}

export interface GenerateConfigAction {
  type: 'generate_config';
  success: boolean;
  config?: any; // Can be any shape - gets validated in ValidateConfigAction
  attempt: number;
  error?: string;
}

export interface ValidateConfigAction {
  type: 'validate_config';
  success: boolean;
  config?: VisualizationConfig;
  attempt: number;
  error?: string;
}

export type Action = GenerateEsqlAction | GenerateConfigAction | ValidateConfigAction;

export function isGenerateEsqlAction(action: Action): action is GenerateEsqlAction {
  return action.type === 'generate_esql';
}

export function isGenerateConfigAction(action: Action): action is GenerateConfigAction {
  return action.type === 'generate_config';
}

export function isValidateConfigAction(action: Action): action is ValidateConfigAction {
  return action.type === 'validate_config';
}

// Node name constants
export const GENERATE_ESQL_NODE = 'generate_esql_query';
export const GENERATE_CONFIG_NODE = 'generate_config';
export const VALIDATE_CONFIG_NODE = 'validate_config';

// Configuration constants
export const MAX_RETRY_ATTEMPTS = 5;
