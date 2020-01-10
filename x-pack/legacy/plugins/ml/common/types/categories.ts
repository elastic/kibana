/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
