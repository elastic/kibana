/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Impact vocabulary an action and a proposal share. */
export type ApprovalProposalImpact = 'low' | 'medium' | 'high' | 'critical';

/**
 * The part of a proposal the approval UI reads.
 *
 * Structural rather than the plugin's own `ProposalWithMetadata`, which this package cannot
 * import: `agentic_investigations` already references this package, so the reverse reference
 * would close a project-reference cycle. A real proposal satisfies this shape, so hosts pass
 * theirs unchanged and a field renamed upstream fails to compile here.
 */
export interface ApprovalProposal {
  /** Markdown explaining what is being proposed. */
  comment: string;
  /** Snapshotted at creation. Absent only on a proposal that predates the field. */
  impact?: ApprovalProposalImpact;
  /** Only ever compared against `'expired'`, so the vocabulary stays with the plugin that owns it. */
  status: string;
  /** The deadline evaluated on read, which `status` does not cover until the workflow settles it. */
  expired: boolean;
  actionWorkflowId?: string;
  /** Resolved from the action workflow's own metadata on read. */
  action?: {
    name?: string;
    impact?: ApprovalProposalImpact;
  };
}
