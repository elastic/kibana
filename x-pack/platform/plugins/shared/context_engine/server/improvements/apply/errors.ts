/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A suggestion could not be applied for a reason the user can act on: a malformed payload, a target
 * that has since disappeared, a destination that cannot be written to. The message is surfaced on
 * the improvement itself (`resolution.error`) and the suggestion stays actionable, so approving it
 * again after fixing the cause is a valid move.
 */
export class ApplyImprovementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApplyImprovementError';
  }
}
