/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { useQueryClient } from '@kbn/react-query';
import { ApprovalContent, type DeclineParams } from '@kbn/proposals-ui';
import { useProposal } from '@kbn/proposals-plugin/public';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { decisionErrorMessage } from '../../conversation_templates/shared/proposed_actions/decision_errors';
import { PROPOSED_ACTIONS_LOAD_ERROR_LABEL } from '../../conversation_templates/shared/proposed_actions/translations';
import { useProposalDecision } from '../../conversation_templates/shared/proposed_actions/use_proposal_decision';
import { investigationQueryKeys } from '../../investigations/query_keys';

export interface ProposalDecisionProps {
  /** The investigation (conversation) the proposal belongs to, read again after a decision. */
  investigationId: string;
  proposalId: string;
}

/**
 * Approve or decline one proposed action from the hypothesis tree, with the same card the chat
 * shows. Without the decide capability the buttons show disabled. After a decision the
 * investigation is read again, so the tree's action node shows the new status.
 */
export const ProposalDecision = ({
  investigationId,
  proposalId,
}: ProposalDecisionProps): React.ReactElement => {
  const queryClient = useQueryClient();
  const { data: proposal, isLoading } = useProposal(proposalId);
  const { readOnly, isSubmitting, currentActorName, approve, dismiss } =
    useProposalDecision(proposalId);

  const refreshInvestigation = useCallback(
    () =>
      queryClient.invalidateQueries({ queryKey: investigationQueryKeys.detail(investigationId) }),
    [investigationId, queryClient]
  );

  // `ApprovalContent` shows a thrown error's message in the card, so failures are rethrown readable.
  const handleApprove = useCallback(async () => {
    try {
      await approve(proposal?.actionInput);
    } catch (err) {
      throw new Error(decisionErrorMessage(err));
    }
    await refreshInvestigation();
  }, [approve, proposal?.actionInput, refreshInvestigation]);

  const handleDismiss = useCallback(
    async (params: DeclineParams) => {
      try {
        await dismiss(params);
      } catch (err) {
        throw new Error(decisionErrorMessage(err));
      }
      await refreshInvestigation();
    },
    [dismiss, refreshInvestigation]
  );

  if (isLoading) {
    return <EuiLoadingSpinner size="m" />;
  }
  if (!proposal) {
    return <KbnDangerCallout size="s" title={PROPOSED_ACTIONS_LOAD_ERROR_LABEL} />;
  }

  return (
    <ApprovalContent
      proposal={proposal}
      readOnly={readOnly}
      isSubmitting={isSubmitting}
      currentActorName={currentActorName}
      onApprove={handleApprove}
      onDismiss={handleDismiss}
      data-test-subj={`investigationHypothesisTreeProposal-${proposalId}`}
    />
  );
};
