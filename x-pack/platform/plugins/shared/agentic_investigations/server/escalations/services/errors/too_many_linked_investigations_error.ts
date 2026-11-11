/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Thrown when the resulting union of linked investigations would exceed the
 * per-escalation limit after appending the caller-supplied IDs.
 */
export class TooManyLinkedInvestigationsError extends Error {
  constructor(resultingCount: number, limit: number) {
    super(
      `Linking these investigations would bring the total to ${resultingCount}, which exceeds the limit of ${limit}`
    );
    this.name = 'TooManyLinkedInvestigationsError';
  }
}
