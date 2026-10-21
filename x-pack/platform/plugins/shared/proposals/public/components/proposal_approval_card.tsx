/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { css } from '@emotion/react';
import { EuiLoadingSpinner, EuiSpacer, useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';
import { KbnDangerCallout, KbnInfoCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { isHttpFetchError } from '@kbn/core-http-browser';
import { ApprovalContent } from '@kbn/proposals-ui';
import type { ApprovalAction, DeclineParams } from '@kbn/proposals-ui';
import { getUserDisplayName } from '@kbn/user-profile-components';
import { isAwaitingDecision } from '@kbn/proposals-common';
import {
  useApproveProposal,
  useDismissProposal,
  useIsApprovingProposal,
  useIsDecliningProposal,
  useProposal,
} from '../hooks/use_proposals_api';
import { useCurrentUserProfile } from '../hooks/use_current_user_profile';

/**
 * Turns a decision mutation's rejection into the friendly text `ApprovalContent` shows in its own
 * error banner — the HTTP-status nuance (already decided, settled as expired, superseded) belongs
 * here, where the plugin can read `isHttpFetchError`; the shared package only ever sees the
 * resulting message. A 409 covers all of those: `assertDecidable` rejects a non-`pending` proposal
 * (decided, expired, or otherwise settled) with the same conflict, so the message stays deliberately
 * generic rather than naming one cause.
 */
const toFriendlyError = (error: unknown): Error => {
  if (isHttpFetchError(error)) {
    if (error.response?.status === 409) {
      return new Error(
        i18n.translate('xpack.proposals.proposalCard.conflictError', {
          defaultMessage:
            'This proposal is no longer available to decide. Refresh the page to see its current status.',
        })
      );
    }
  }
  return error instanceof Error
    ? error
    : new Error(
        i18n.translate('xpack.proposals.proposalCard.genericError', {
          defaultMessage: 'The decision could not be recorded. Please try again.',
        })
      );
};

export interface ProposalApprovalCardProps {
  /** Proposal id from `attachment.origin ?? attachment.data.proposalId`. */
  proposalId: string;
}

/**
 * Inline card rendered inside the Agent Builder conversation stream when a
 * proposal attachment is encountered.
 *
 * Renders inside the framework's `EuiSplitPanel.Inner paddingSize="none"`, so
 * the card adds its own horizontal padding.
 *
 * Shares `ApprovalContent`'s own decision engine — including its built-in decline flow — with the
 * AlertZero flyout's approval modal, so the "Applying"/"Applied"/"Declined" states, the badge, the
 * outcome banner, and the inline decline form are the same UI whether the proposal is reached
 * from the queue or from the chat page a worker posted it to.
 */
export const ProposalApprovalCard = memo<ProposalApprovalCardProps>(({ proposalId }) => {
  const { euiTheme } = useEuiTheme();
  const titleId = useGeneratedHtmlId({ prefix: 'ApprovalChatCard' });

  const proposalQuery = useProposal(proposalId);
  const approveMutation = useApproveProposal();
  const dismissMutation = useDismissProposal();
  const isApproving = useIsApprovingProposal(proposalId);
  const isDeclining = useIsDecliningProposal(proposalId);
  const isSubmitting = isApproving ? 'applying' : isDeclining ? 'declining' : undefined;
  const { data: currentUserProfile } = useCurrentUserProfile();

  const currentActorName = currentUserProfile
    ? getUserDisplayName(currentUserProfile.user)
    : undefined;

  const handleApprove = useCallback(async () => {
    try {
      await approveMutation.mutateAsync({
        id: proposalId,
        body: { actionInput: proposalQuery.data?.actionInput },
      });
    } catch (err) {
      throw toFriendlyError(err);
    }
  }, [approveMutation, proposalQuery.data?.actionInput, proposalId]);

  const handleDismiss = useCallback(
    async ({ dismissReason, rationale }: DeclineParams) => {
      try {
        await dismissMutation.mutateAsync({
          id: proposalId,
          body: { dismissReason, rationale },
        });
      } catch (err) {
        throw toFriendlyError(err);
      }
    },
    [dismissMutation, proposalId]
  );

  const liveProposal = proposalQuery.data;

  if (proposalQuery.isLoading) {
    return <EuiLoadingSpinner size="m" />;
  }

  if (proposalQuery.isError || !liveProposal) {
    return (
      <KbnDangerCallout
        size="s"
        title={i18n.translate('xpack.proposals.proposalCard.loadError', {
          defaultMessage: 'Unable to load this proposal. Try refreshing the page.',
        })}
      />
    );
  }

  const isReplaced =
    liveProposal.supersededBy !== undefined || liveProposal.status === 'superseded';
  const isPending = isAwaitingDecision(liveProposal);
  const secondaryActions: ApprovalAction[] | undefined = isReplaced
    ? [
        {
          label: i18n.translate('xpack.proposals.proposalCard.dismiss', {
            defaultMessage: 'Dismiss',
          }),
          color: 'danger',
          onClick: () => undefined,
          isDisabled: true,
          'data-test-subj': `proposalDismiss-${proposalId}`,
        },
      ]
    : undefined;

  return (
    <div
      css={css({ padding: `${euiTheme.size.xs}` })}
      data-test-subj={`proposalCard-${proposalId}`}
    >
      <ApprovalContent
        key={isReplaced ? 'replaced' : 'current'}
        proposal={liveProposal}
        titleId={titleId}
        readOnly={isReplaced}
        isSubmitting={isReplaced ? undefined : isSubmitting}
        currentActorName={currentActorName}
        onApprove={isPending || isReplaced ? handleApprove : undefined}
        secondaryActions={secondaryActions}
        onDismiss={isPending && !isReplaced ? handleDismiss : undefined}
        data-test-subj={`proposalCard-${proposalId}`}
      />
      {isReplaced && (
        <>
          <EuiSpacer size="m" />
          <div css={css({ padding: `0 ${euiTheme.size.m}` })}>
            <KbnInfoCallout
              announceOnMount
              size="s"
              title={i18n.translate('xpack.proposals.proposalCard.replacedTitle', {
                defaultMessage: 'This proposal has been replaced.',
              })}
            />
          </div>
          <EuiSpacer size="m" />
        </>
      )}
    </div>
  );
});

ProposalApprovalCard.displayName = 'ProposalApprovalCard';
