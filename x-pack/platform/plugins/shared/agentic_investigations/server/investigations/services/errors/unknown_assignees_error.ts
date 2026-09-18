/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Thrown when one or more supplied assignee profile UIDs do not exist in Kibana.
 * Surfaces as a 400 so the caller knows their input was invalid, not that a
 * downstream system failed.
 */
export class UnknownAssigneesError extends Error {
  constructor(unknownIds: string[]) {
    super(
      `The following assignee profile UIDs do not exist: ${unknownIds
        .map((id) => `"${id}"`)
        .join(', ')}`
    );
    this.name = 'UnknownAssigneesError';
  }
}
