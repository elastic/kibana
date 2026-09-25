/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Thrown when one or more pending proposals could not be dismissed during a close
 * operation. The investigation is left open so the caller can retry.
 *
 * The `failedProposalIds` are the ones that encountered an unexpected error; proposals
 * that were already decided or expired are silently skipped and are not in this list.
 */
export class ProposalDismissFailedError extends Error {
  readonly code = 'proposal_dismiss_failed';
  readonly failedProposalIds: string[];

  constructor(failedIds: string[]) {
    super(
      `${failedIds.length} proposal(s) could not be dismissed; the investigation has not been closed`
    );
    this.name = 'ProposalDismissFailedError';
    this.failedProposalIds = failedIds;
  }
}
