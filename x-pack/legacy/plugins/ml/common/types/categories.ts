/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CATEGORY_EXAMPLES_VALIDATION_STATUS } from '../constants/new_job';

export type CategoryId = number;

export interface Category {
  job_id: string;
  category_id: CategoryId;
  terms: string;
  regex: string;
  max_matching_length: number;
  examples: string[];
  grok_pattern: string;
}

export interface Token {
  token: string;
  start_offset: number;
  end_offset: number;
  type: string;
  position: number;
}

export interface CategorizationAnalyzer {
  char_filter?: any[];
  tokenizer?: string;
  filter?: any[];
  analyzer?: string;
}

export interface CategoryFieldExample {
  text: string;
  tokens: Token[];
}

export enum VALIDATION_RESULT {
  TOKEN_COUNT,
  MEDIAN_LINE_LENGTH,
  NULL_VALUES,
  NO_EXAMPLES,
  TOO_MANY_TOKENS,
  FAILED_TO_TOKENIZE,
  INSUFFICIENT_PRIVILEGES,
}

export interface FieldExampleCheck {
  id: VALIDATION_RESULT;
  valid: CATEGORY_EXAMPLES_VALIDATION_STATUS;
  message: string;
}
