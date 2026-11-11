/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Thrown when one or more linked investigations could not be closed during an
 * escalation close operation. The escalation itself is left open.
 *
 * Investigations that were already closed before this call stay closed.
 * Investigations that were successfully closed in this call stay closed.
 * Only the skipped ones need to be retried, and since the preview only lists
 * open investigations, a subsequent confirm handles only the remaining ones.
 */
export class EscalationCloseIncompleteError extends Error {
  readonly code = 'escalation_close_incomplete';
  readonly closedInvestigationIds: string[];
  readonly skippedInvestigationIds: string[];

  constructor(closedIds: string[], skippedIds: string[]) {
    super(
      `${skippedIds.length} linked investigation(s) could not be closed; the escalation has not been closed`
    );
    this.name = 'EscalationCloseIncompleteError';
    this.closedInvestigationIds = closedIds;
    this.skippedInvestigationIds = skippedIds;
  }
}
