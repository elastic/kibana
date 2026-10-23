/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getApprovalOutcomeBadge, type ApprovalOutcomeBadge } from './approval_outcome';
import { getProposalPhase } from './proposal_helpers';
import { APPROVAL_MODAL_TRANSLATIONS } from './translations';
import type { ApprovalProposal } from './types';

const NEEDS_REVIEW_BADGE: ApprovalOutcomeBadge = {
  color: 'primary',
  iconType: 'eye',
  label: APPROVAL_MODAL_TRANSLATIONS.needsReviewBadge,
  isLoading: false,
};

const RESTRICTED_BADGE: ApprovalOutcomeBadge = {
  color: 'warning',
  iconType: 'lock',
  label: APPROVAL_MODAL_TRANSLATIONS.restrictedBadge,
  isLoading: false,
};

export interface ProposalBadgeOptions {
  /** The user cannot decide. */
  readOnly?: boolean;
  /** The host's in-flight approve/decline, if any. */
  isSubmitting?: 'applying' | 'declining';
}

/**
 * The status badge of a proposal. The flyout row and the modal it opens both read it from here,
 * so the badge outside and the badge inside always say the same thing.
 */
export const getProposalBadge = (
  proposal: ApprovalProposal,
  { readOnly = false, isSubmitting }: ProposalBadgeOptions = {}
): ApprovalOutcomeBadge => {
  const phase = getProposalPhase(proposal, isSubmitting);

  if (phase !== 'pending') {
    return getApprovalOutcomeBadge(phase) ?? NEEDS_REVIEW_BADGE;
  }
  if (readOnly) {
    return RESTRICTED_BADGE;
  }
  return NEEDS_REVIEW_BADGE;
};
