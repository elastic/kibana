/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Logger } from '@kbn/core/server';

export interface Config {
  maxRevisions: number;
  maxPolicies: number;
  maxDocsToDelete: number;
  timeout?: string;
}

export interface Context {
  abortController?: AbortController;
  logger: Logger;
  config: Config;
}

export type PoliciesRevisionSummaries = Record<
  string,
  {
    maxRevision: number;
    minUsedRevision?: number;
    count: number;
  }
>;
