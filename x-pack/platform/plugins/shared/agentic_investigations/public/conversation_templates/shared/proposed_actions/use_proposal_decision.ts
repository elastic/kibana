/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  PROPOSALS_UI_CAPABILITY_DECIDE,
  type ApproveProposalRequest,
  type Proposal,
} from '@kbn/proposals-common';
import type { DeclineParams } from '@kbn/proposals-ui';
import {
  notifyProposalDecided,
  type ProposalDecidedEvent,
  type ProposalDecisionSurface,
  isDecisionShown,
  useApproveProposal,
  useDismissProposal,
  useIsApprovingProposal,
  useIsDecliningProposal,
  useIsReopeningProposal,
  useReopenProposal,
} from '@kbn/proposals-plugin/public';
import { getUserDisplayName } from '@kbn/user-profile-components';
import { useCurrentUserProfile } from '../../../user_profiles';

/** The part of the proposal that shows whether its decision is visible in this row's data. */
type ProposalDecisionData = Pick<
  Proposal,
  'decision' | 'status' | 'supersededBy' | 'conversationId' | 'category' | 'confidence' | 'impact'
>;

export interface ProposalDecisionContext {
  surface: ProposalDecisionSurface;
  investigationId?: string;
}

export interface ProposalDecision {
  /** The caller lacks the proposals decide capability. */
  readOnly: boolean;
  isSubmitting?: 'applying' | 'declining';
  currentActorName?: string;
  approve: (actionInput: ApproveProposalRequest['actionInput']) => Promise<unknown>;
  dismiss: (params: DeclineParams) => Promise<unknown>;
  /** Marks a to-do proposal that was marked as applied as not applied. */
  reopen: () => Promise<unknown>;
  isReopening: boolean;
}

/**
 * Approving or declining one proposed action: the capability check, the mutations, and the
 * submitting state scoped to this proposal, shared by every place an investigation decides one.
 */
export const useProposalDecision = (
  proposalId: string,
  proposal: ProposalDecisionData | undefined,
  { surface, investigationId }: ProposalDecisionContext
): ProposalDecision => {
  const {
    services: { application },
  } = useKibana<CoreStart>();
  const { mutateAsync: approveProposal } = useApproveProposal();
  const { mutateAsync: dismissProposal } = useDismissProposal();
  const { mutateAsync: reopenProposal } = useReopenProposal();
  const isReopening = useIsReopeningProposal(proposalId);
  const decisionShown = isDecisionShown(proposal);
  const isApproving = useIsApprovingProposal(proposalId, decisionShown);
  const isDeclining = useIsDecliningProposal(proposalId, decisionShown);
  const { data: currentUserProfile } = useCurrentUserProfile();

  const report = useCallback(
    (event: Pick<ProposalDecidedEvent, 'decision' | 'dismissReason'>) =>
      notifyProposalDecided({
        ...event,
        proposalId,
        surface,
        investigationId,
        conversationId: proposal?.conversationId,
        category: proposal?.category,
        confidence: proposal?.confidence,
        impact: proposal?.impact,
      }),
    [proposalId, surface, investigationId, proposal]
  );

  const approve = useCallback(
    async (actionInput: ApproveProposalRequest['actionInput']) => {
      const result = await approveProposal({ id: proposalId, body: { actionInput } });
      report({ decision: 'approve' });
      return result;
    },
    [approveProposal, proposalId, report]
  );
  const dismiss = useCallback(
    async ({ dismissReason, rationale }: DeclineParams) => {
      const result = await dismissProposal({
        id: proposalId,
        body: { dismissReason, rationale },
      });
      report({ decision: 'decline', dismissReason });
      return result;
    },
    [dismissProposal, proposalId, report]
  );

  const reopen = useCallback(async () => {
    const result = await reopenProposal({ id: proposalId });
    report({ decision: 'reopen' });
    return result;
  }, [reopenProposal, proposalId, report]);

  return {
    readOnly: application.capabilities.proposals?.[PROPOSALS_UI_CAPABILITY_DECIDE] !== true,
    isSubmitting: isApproving ? 'applying' : isDeclining ? 'declining' : undefined,
    currentActorName: currentUserProfile ? getUserDisplayName(currentUserProfile.user) : undefined,
    approve,
    dismiss,
    reopen,
    isReopening,
  };
};
