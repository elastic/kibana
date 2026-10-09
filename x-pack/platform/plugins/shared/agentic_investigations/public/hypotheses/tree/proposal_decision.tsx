/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useQueryClient } from '@kbn/react-query';
import { PROPOSALS_UI_CAPABILITY_DECIDE } from '@kbn/proposals-common';
import { ApprovalContent, type DeclineParams } from '@kbn/proposals-ui';
import {
  useApproveProposal,
  useDismissProposal,
  useIsApprovingProposal,
  useIsDecliningProposal,
  useProposal,
} from '@kbn/proposals-plugin/public';
import { getUserDisplayName } from '@kbn/user-profile-components';
import { decisionErrorMessage } from '../../conversation_templates/shared/proposed_actions/decision_errors';
import { investigationQueryKeys } from '../../investigations/query_keys';
import { useCurrentUserProfile } from '../../user_profiles';

export interface ProposalDecisionProps {
  /** The investigation (conversation) the proposal belongs to, read again after a decision. */
  investigationId: string;
  proposalId: string;
  /** Shown while the full proposal loads, or when it cannot be read. */
  fallback: React.ReactNode;
}

/**
 * Approve or decline one proposed action from the hypothesis tree, with the same card the chat
 * shows. Without the decide capability the buttons show disabled. After a decision the
 * investigation is read again, so the tree's action node shows the new status.
 */
export const ProposalDecision = ({
  investigationId,
  proposalId,
  fallback,
}: ProposalDecisionProps): React.ReactElement => {
  const {
    services: { application },
  } = useKibana<CoreStart>();
  const queryClient = useQueryClient();
  const { data: proposal, isLoading } = useProposal(proposalId);
  const approve = useApproveProposal();
  const dismiss = useDismissProposal();
  const isApproving = useIsApprovingProposal(proposalId);
  const isDeclining = useIsDecliningProposal(proposalId);
  const { data: currentUserProfile } = useCurrentUserProfile();
  const canDecide = application.capabilities.proposals?.[PROPOSALS_UI_CAPABILITY_DECIDE] === true;

  const refreshInvestigation = useCallback(
    () =>
      queryClient.invalidateQueries({ queryKey: investigationQueryKeys.detail(investigationId) }),
    [investigationId, queryClient]
  );

  // `ApprovalContent` shows a thrown error's message in the card, so failures are rethrown readable.
  const handleApprove = useCallback(async () => {
    try {
      await approve.mutateAsync({ id: proposalId, body: { actionInput: proposal?.actionInput } });
    } catch (err) {
      throw new Error(decisionErrorMessage(err));
    }
    await refreshInvestigation();
  }, [approve, proposal?.actionInput, proposalId, refreshInvestigation]);

  const handleDismiss = useCallback(
    async ({ dismissReason, rationale }: DeclineParams) => {
      try {
        await dismiss.mutateAsync({ id: proposalId, body: { dismissReason, rationale } });
      } catch (err) {
        throw new Error(decisionErrorMessage(err));
      }
      await refreshInvestigation();
    },
    [dismiss, proposalId, refreshInvestigation]
  );

  if (!proposal) {
    return isLoading ? <EuiLoadingSpinner size="m" /> : <>{fallback}</>;
  }

  return (
    <ApprovalContent
      proposal={proposal}
      readOnly={!canDecide}
      isSubmitting={isApproving ? 'applying' : isDeclining ? 'declining' : undefined}
      currentActorName={
        currentUserProfile ? getUserDisplayName(currentUserProfile.user) : undefined
      }
      onApprove={handleApprove}
      onDismiss={handleDismiss}
      data-test-subj={`investigationHypothesisTreeProposal-${proposalId}`}
    />
  );
};
