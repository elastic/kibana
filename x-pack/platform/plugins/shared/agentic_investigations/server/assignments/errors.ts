/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Thrown when the caller supplies a conversation id whose `template_id` does not match
 * the expected template for the route. Surfaces as a 404 so callers cannot distinguish
 * wrong-template from not-found.
 */
export class WrongTemplateError extends Error {
  constructor(conversationId: string, expectedTemplate: string) {
    super(`Conversation "${conversationId}" is not a ${expectedTemplate}`);
    this.name = 'WrongTemplateError';
  }
}
