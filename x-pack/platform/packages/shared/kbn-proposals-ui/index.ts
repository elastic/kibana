/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { ApprovalModal, type ApprovalModalProps } from './src/approval_modal';
export {
  ApprovalContent,
  type ApprovalContentProps,
  type ApprovalAction,
  type ApprovalDecision,
  type AlwaysAllowOption,
} from './src/approval_content';
export {
  getApprovalOutcomeBadge,
  type ApprovalOutcomeBadge,
  type ApprovalOutcomeStatus,
  type ApprovalPhase,
} from './src/approval_outcome';
export {
  ProposedActionStatusBadge,
  type ProposedActionStatusBadgeProps,
} from './src/needs_review_badge';
export {
  getProposalCaption,
  getProposalDecision,
  getProposalTitle,
  getProposalTone,
  isProposalExpired,
} from './src/proposal_helpers';
export type { ApprovalProposal } from './src/types';
