/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { KbnInfoCallout } from '@kbn/ui-callout';
import type { DeclineParams } from '@kbn/proposals-ui';
import { ApprovalContent } from '@kbn/proposals-ui';
import { isAwaitingDecision, PROPOSALS_UI_CAPABILITY_DECIDE } from '@kbn/proposals-common';
import type { ProposalAttachmentMetadata } from '../../../../../common/types/domain/attachment/proposal/v2';
import type { UnifiedReferenceAttachmentViewProps } from '../../../../client/attachment_framework/types';
import { useKibana } from '../../../../common/lib/kibana';
import { useDecideProposal, useGetProposal } from '../api';
import {
  DECIDE_CONFLICT_ERROR,
  DECIDE_FORBIDDEN_ERROR,
  DECIDE_GENERIC_ERROR,
  PROPOSAL_UNAVAILABLE,
  REPLACED_BODY,
  REPLACED_TITLE,
} from '../translations';

export type ProposalViewProps = UnifiedReferenceAttachmentViewProps<
  ProposalAttachmentMetadata,
  string
>;

/** `ApprovalContent` shows a rejected decision's message in its own banner. */
const toDecisionError = (error: unknown): Error => {
  if (isHttpFetchError(error)) {
    // Decided, expired or replaced since it was loaded: the API refuses all of them with a 409.
    if (error.response?.status === 409) {
      return new Error(DECIDE_CONFLICT_ERROR);
    }
    if (error.response?.status === 403) {
      return new Error(DECIDE_FORBIDDEN_ERROR);
    }
  }
  return new Error(DECIDE_GENERIC_ERROR);
};

/**
 * The live proposal, with Approve and Decline for a viewer who can decide one awaiting a decision.
 * Falls back to the title stored on the case when the proposal can't be read.
 */
export const ProposalActivity = ({ attachmentId, metadata }: ProposalViewProps) => {
  const {
    services: { http, application },
  } = useKibana();
  const canDecide = application.capabilities.proposals?.[PROPOSALS_UI_CAPABILITY_DECIDE] === true;
  const { data: proposal, isLoading, isError } = useGetProposal(attachmentId);
  const { approve, dismiss } = useDecideProposal(attachmentId);

  const handleApprove = useCallback(async () => {
    try {
      // The API refuses an approval whose input no longer matches the proposal.
      await approve.mutateAsync({ actionInput: proposal?.actionInput });
    } catch (error) {
      throw toDecisionError(error);
    }
  }, [approve, proposal?.actionInput]);

  const handleDismiss = useCallback(
    async ({ dismissReason, rationale }: DeclineParams) => {
      try {
        await dismiss.mutateAsync({ dismissReason, rationale });
      } catch (error) {
        throw toDecisionError(error);
      }
    },
    [dismiss]
  );

  if (isLoading) {
    return <EuiLoadingSpinner size="m" data-test-subj="proposal-activity-loading" />;
  }

  if (isError || !proposal) {
    return (
      <KbnInfoCallout
        size="s"
        title={metadata?.title}
        data-test-subj={`proposal-activity-unavailable-${attachmentId}`}
      >
        {PROPOSAL_UNAVAILABLE}
      </KbnInfoCallout>
    );
  }

  const isReplaced = proposal.supersededBy !== undefined || proposal.status === 'superseded';
  const isDecidable = canDecide && !isReplaced && isAwaitingDecision(proposal);

  return (
    <>
      <ApprovalContent
        proposal={proposal}
        readOnly={!canDecide}
        isSubmitting={approve.isLoading ? 'applying' : dismiss.isLoading ? 'declining' : undefined}
        onApprove={isDecidable ? handleApprove : undefined}
        onDismiss={isDecidable ? handleDismiss : undefined}
        basePath={http.basePath}
        data-test-subj={`proposal-activity-${attachmentId}`}
      />
      {isReplaced && (
        <>
          <EuiSpacer size="m" />
          {/* As the chat card does. The case keeps the proposal that was attached, so the row says
              where the live one went rather than showing it in its place. */}
          <KbnInfoCallout
            size="s"
            title={REPLACED_TITLE}
            data-test-subj={`proposal-activity-replaced-${attachmentId}`}
          >
            {REPLACED_BODY}
          </KbnInfoCallout>
        </>
      )}
    </>
  );
};

ProposalActivity.displayName = 'ProposalActivity';
