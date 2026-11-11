/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export class ResolutionSearchTruncatedError extends Error {
  constructor(context: string, returned: number, total: number) {
    super(
      `${context}: search returned ${returned} of ${total} total results. ` +
        `This resolution group is too large to process safely.`
    );
    this.name = 'ResolutionSearchTruncatedError';
  }
}
