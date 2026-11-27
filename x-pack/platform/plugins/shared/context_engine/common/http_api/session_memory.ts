/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type ForgetSessionMemoryResult =
  | { id: string; outcome: 'forgotten' | 'already_forgotten' | 'not_found' }
  | { id: string; outcome: 'failed'; error: string };

export interface ForgetSessionMemoriesResponse {
  results: ForgetSessionMemoryResult[];
}

export interface RememberSessionMemoryResponse {
  id: string;
}
