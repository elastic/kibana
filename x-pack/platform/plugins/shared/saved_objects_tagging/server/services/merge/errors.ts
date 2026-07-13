/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Error returned from {@link MergeService} when a merge request is invalid or forbidden.
 */
export class MergeError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    Object.setPrototypeOf(this, MergeError.prototype);
  }
}
