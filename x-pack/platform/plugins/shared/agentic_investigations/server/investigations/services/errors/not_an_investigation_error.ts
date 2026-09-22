/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Thrown when the caller supplies an investigation id that resolves to a conversation
 * whose `template_id` is not `'investigation'`. Surfaces as a 404 because from the
 * caller's perspective no investigation with that id exists.
 */
export class NotAnInvestigationError extends Error {
  constructor(conversationId: string) {
    super(`Conversation "${conversationId}" is not an investigation`);
    this.name = 'NotAnInvestigationError';
  }
}
