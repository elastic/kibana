/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProposalWithMetadata } from '@kbn/proposals-common';

/** Impact vocabulary an action and a proposal share. */
export type ApprovalProposalImpact = NonNullable<ProposalWithMetadata['impact']>;

/**
 * The part of a proposal the approval UI reads. Narrowed rather than widened to
 * the whole record, so a component cannot quietly start depending on a field
 * the host does not have to supply.
 */
export type ApprovalProposal = Pick<
  ProposalWithMetadata,
  | 'comment'
  | 'impact'
  | 'status'
  | 'expired'
  | 'category'
  | 'expiresAt'
  | 'actionWorkflowId'
  | 'action'
  | 'decision'
  | 'decidedBy'
  | 'decidedAt'
  | 'rationale'
>;
