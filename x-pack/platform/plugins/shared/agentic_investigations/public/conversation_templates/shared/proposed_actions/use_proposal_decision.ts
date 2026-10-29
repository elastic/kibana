/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { PROPOSALS_UI_CAPABILITY_DECIDE, type ApproveProposalRequest } from '@kbn/proposals-common';
import type { DeclineParams } from '@kbn/proposals-ui';
import {
  useApproveProposal,
  useDismissProposal,
  useIsApprovingProposal,
  useIsDecliningProposal,
  useIsReopeningProposal,
  useReopenProposal,
} from '@kbn/proposals-plugin/public';
import { getUserDisplayName } from '@kbn/user-profile-components';
import { useCurrentUserProfile } from '../../../user_profiles';

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
export const useProposalDecision = (proposalId: string): ProposalDecision => {
  const {
    services: { application },
  } = useKibana<CoreStart>();
  const { mutateAsync: approveProposal } = useApproveProposal();
  const { mutateAsync: dismissProposal } = useDismissProposal();
  const { mutateAsync: reopenProposal } = useReopenProposal();
  const isReopening = useIsReopeningProposal(proposalId);
  const isApproving = useIsApprovingProposal(proposalId);
  const isDeclining = useIsDecliningProposal(proposalId);
  const { data: currentUserProfile } = useCurrentUserProfile();

  const approve = useCallback(
    (actionInput: ApproveProposalRequest['actionInput']) =>
      approveProposal({ id: proposalId, body: { actionInput } }),
    [approveProposal, proposalId]
  );
  const dismiss = useCallback(
    ({ dismissReason, rationale }: DeclineParams) =>
      dismissProposal({ id: proposalId, body: { dismissReason, rationale } }),
    [dismissProposal, proposalId]
  );

  const reopen = useCallback(
    () => reopenProposal({ id: proposalId }),
    [reopenProposal, proposalId]
  );

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
