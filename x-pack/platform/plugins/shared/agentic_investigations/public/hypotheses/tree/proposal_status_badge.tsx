/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  getApprovalOutcomeBadge,
  getProposalDecision,
  ProposedActionStatusBadge,
  type ApprovalPhase,
} from '@kbn/proposals-ui';
import {
  useIsApprovingProposal,
  useIsDecliningProposal,
  useProposal,
} from '@kbn/proposals-plugin/public';

/**
 * A proposed action's status on its tree card: "Needs review", "Applying", "Applied", "Declined",
 * and so on. Reads the same proposal as the approval card in the detail panel, so the two agree
 * as soon as a decision is made there. Renders nothing until the proposal has loaded.
 */
export const ProposalStatusBadge = ({
  proposalId,
}: {
  proposalId: string;
}): React.ReactElement | null => {
  const { data: proposal } = useProposal(proposalId);
  const isApproving = useIsApprovingProposal(proposalId);
  const isDeclining = useIsDecliningProposal(proposalId);

  if (!proposal) {
    return null;
  }

  const decision = getProposalDecision(proposal);
  const phase: ApprovalPhase = decision
    ? decision.status
    : isApproving
    ? 'applying'
    : isDeclining
    ? 'declining'
    : 'pending';
  // `undefined` for `pending`: the badge's own defaults read "Needs review".
  const badge = getApprovalOutcomeBadge(phase);

  return (
    <span data-test-subj={`investigationHypothesisTreeActionStatus-${phase}`}>
      <ProposedActionStatusBadge
        color={badge?.color}
        iconType={badge?.iconType}
        label={badge?.label}
        isLoading={badge?.isLoading}
      />
    </span>
  );
};
