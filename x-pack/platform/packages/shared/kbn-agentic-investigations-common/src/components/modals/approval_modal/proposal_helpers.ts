/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApprovalProposal } from './types';

/**
 * The row's own impact first: a revision can override it, and it is the value the queue sorts
 * by, so preferring the action's declared impact would show the impact a revision replaced.
 * The action's value is only the default for a proposal that never set one.
 */
export const getProposalTone = (proposal: ApprovalProposal): 'primary' | 'danger' => {
  const impact = proposal.impact ?? proposal.action?.impact;
  return impact === 'high' || impact === 'critical' ? 'danger' : 'primary';
};

/**
 * `expired` is the computed flag for a deadline that has passed; `status: 'expired'` is the
 * durable settlement, which the workflow can write before the deadline when no decision was
 * reached. Without both, a proposal settled early still offers a decision that would be refused.
 */
export const isProposalExpired = (proposal: ApprovalProposal): boolean =>
  proposal.expired || proposal.status === 'expired';
