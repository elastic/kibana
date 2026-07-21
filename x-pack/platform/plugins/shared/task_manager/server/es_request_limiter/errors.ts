/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsRequestCategory } from './es_request_categories';

/**
 * Error thrown when a task's Elasticsearch request is rejected because the
 * configured concurrency budget for its category has been reached. It mimics an
 * Elasticsearch "too many requests" response (`statusCode: 429`) so callers that
 * already handle ES backpressure treat it the same way. Task Manager retries it
 * through the normal failure/backoff path.
 */
export class EsRequestLimitReachedError extends Error {
  public readonly statusCode = 429;

  constructor(category: EsRequestCategory, taskType?: string) {
    super(
      `Elasticsearch ${category} request limit reached${
        taskType ? ` while running task "${taskType}"` : ''
      }. The request was rejected to protect Elasticsearch.`
    );
    this.name = 'EsRequestLimitReachedError';
  }
}
