/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Thrown when one or more linked investigation ids cannot be resolved at close
 * time — because the conversation was deleted or the caller does not have access
 * to it.
 *
 * The escalation cannot be closed while unresolvable links exist: closing without
 * touching them would leave open investigations permanently orphaned from the
 * escalation's lifecycle.
 *
 * `unavailableInvestigationIds` is returned to the client so the UI can display
 * which ids are blocking the operation.
 */
export class LinkedInvestigationUnavailableError extends Error {
  readonly code = 'linked_investigation_unavailable';
  readonly unavailableInvestigationIds: string[];

  constructor(unavailableIds: string[]) {
    super(
      `${unavailableIds.length} linked investigation(s) could not be resolved; the escalation cannot be closed`
    );
    this.name = 'LinkedInvestigationUnavailableError';
    this.unavailableInvestigationIds = unavailableIds;
  }
}
