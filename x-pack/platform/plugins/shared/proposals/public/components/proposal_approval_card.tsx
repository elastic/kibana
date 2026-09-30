/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { css } from '@emotion/react';
import { EuiLoadingSpinner, useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { isHttpFetchError } from '@kbn/core-http-browser';
import {
  ApprovalContent,
  getProposalCaption,
  getProposalDecision,
  getProposalTone,
  isProposalExpired,
} from '@kbn/proposals-ui';
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
 * error banner — the HTTP-status nuance (already decided, deadline passed) belongs here, where
 * the plugin can read `isHttpFetchError`; the shared package only ever sees the resulting message.
 */
const toFriendlyError = (error: unknown): Error => {
  if (isHttpFetchError(error)) {
    if (error.response?.status === 409) {
      return new Error(
        i18n.translate('xpack.proposals.proposalCard.conflictError', {
          defaultMessage:
            'This proposal has already been decided. Refresh the page to see its status.',
        })
      );
    }
    if (error.response?.status === 410) {
      return new Error(
        i18n.translate('xpack.proposals.proposalCard.expiredError', {
          defaultMessage:
            'The decision deadline has passed and this proposal can no longer be decided.',
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
  /** Proposal id from `attachment.origin ?? attachment.id`. */
  proposalId: string;
  /**
   * Superseded rows already followed to reach `proposalId`. Set only by the
   * redirect below; a caller rendering the card directly leaves it unset.
   */
  chainHops?: number;
}

/**
 * Ceiling on the superseded-row redirect. A revision chain is as long as the
 * analyst keeps revising, so this is not a product limit — it is the stop that
 * keeps a corrupt chain pointing in a circle from rendering forever.
 */
const MAX_SUPERSEDE_HOPS = 50;

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
export const ProposalApprovalCard = memo<ProposalApprovalCardProps>(
  ({ proposalId, chainHops = 0 }) => {
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

    // A conversation attachment keeps the id it was created with, and a
    // revision marks that row superseded: it carries no actions, so rendering
    // it leaves the analyst with a dead card for a proposal that is no longer
    // the one awaiting their decision. Follow the pointer to the live head
    // instead — that is the revision the fresh decision belongs to.
    const successorId = liveProposal?.supersededBy;
    if (successorId && successorId !== proposalId) {
      if (chainHops >= MAX_SUPERSEDE_HOPS) {
        return (
          <KbnWarningCallout
            size="s"
            title={i18n.translate('xpack.proposals.proposalCard.chainTooLong', {
              defaultMessage:
                'This proposal has been revised many times. Open the conversation again to see its latest revision.',
            })}
          />
        );
      }
      return <ProposalApprovalCard proposalId={successorId} chainHops={chainHops + 1} />;
    }

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

    const isPending = isAwaitingDecision(liveProposal);
    const isExpired = isProposalExpired(liveProposal);
    const decision = getProposalDecision(liveProposal);

    const primaryAction: ApprovalAction | undefined = isPending
      ? {
          label: i18n.translate('xpack.proposals.proposalCard.approve', {
            defaultMessage: 'Approve',
          }),
          color: 'primary',
          onClick: handleApprove,
          isDisabled: isExpired,
          'data-test-subj': `proposalApprove-${proposalId}`,
        }
      : undefined;

    return (
      <div
        css={css({ padding: `${euiTheme.size.m}` })}
        data-test-subj={`proposalCard-${proposalId}`}
      >
        <ApprovalContent
          title={liveProposal.title}
          titleId={titleId}
          tone={getProposalTone(liveProposal)}
          comment={liveProposal.comment}
          caption={getProposalCaption(liveProposal, { includeRiskDetails: true })}
          decision={decision}
          isSubmitting={isSubmitting}
          currentActorName={currentActorName}
          primaryAction={primaryAction}
          onDismiss={isPending ? handleDismiss : undefined}
          previousExecutionError={liveProposal.previousExecutionError}
          isExpired={isExpired}
          data-test-subj={`proposalCard-${proposalId}`}
        />
      </div>
    );
  }
);

ProposalApprovalCard.displayName = 'ProposalApprovalCard';
