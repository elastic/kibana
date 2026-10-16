/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Thrown when the caller supplies a `linked_investigation_id` that resolves to
 * a conversation whose `template_id` is not `'investigation'`. Only conversations
 * on the investigation template may be escalated.
 *
 * Other failure modes (missing conversation, insufficient access) surface as
 * AgentBuilderErrors that already carry appropriate status codes, so we do not
 * re-wrap those.
 */
export class InvalidLinkedInvestigationError extends Error {
  constructor(conversationId: string) {
    super(
      `Conversation "${conversationId}" is not an investigation and cannot be linked to an escalation`
    );
    this.name = 'InvalidLinkedInvestigationError';
  }
}
