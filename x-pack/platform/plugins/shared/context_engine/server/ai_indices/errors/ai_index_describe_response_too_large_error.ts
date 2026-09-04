/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class AiIndexDescribeResponseTooLargeError extends Error {
  constructor(maxBytes: number) {
    super(
      `Describing the AI index read more than the maximum allowed ${Math.floor(
        maxBytes / (1024 * 1024)
      )}MB from Elasticsearch. Point the AI index at fewer or smaller indices.`
    );
    this.name = 'AiIndexDescribeResponseTooLargeError';
  }
}
