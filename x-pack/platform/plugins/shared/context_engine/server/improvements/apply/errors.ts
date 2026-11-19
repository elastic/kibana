/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Error applying an improvement for a reason the user can fix; its message is recorded on the improvement. */
export class ApplyImprovementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApplyImprovementError';
  }
}
