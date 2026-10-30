/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Thrown when the caller can read an escalation but neither owns it nor is a
 * listed participant. Surfaces as 403: the escalation exists, and reading a
 * public one is not permission to attach investigations to it.
 */
export class EscalationLinkForbiddenError extends Error {
  constructor(escalationId: string) {
    super(
      `Only the owner or a participant can link investigations to escalation "${escalationId}"`
    );
    this.name = 'EscalationLinkForbiddenError';
  }
}
