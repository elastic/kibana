/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import {
  ApprovalActorTime,
  ApprovalModal,
  getApprovalOutcomeBadge,
  getProposalCaption,
  getProposalDecision,
  ProposedActionStatusBadge,
  type ApprovalPhase,
  type ApprovalProposal,
  type DeclineParams,
} from '@kbn/proposals-ui';
import { DETAILS_FLYOUT_LABELS } from './translations';
import { getEmptyValue } from '../helpers';

export interface ProposedActionButtonProps {
  readOnly?: boolean;
  /** Same shape the card's recommended-action menu item reads its proposal from. */
  proposal: ApprovalProposal;
  /** Commits the approval — pass the mutation's own promise (`mutateAsync`). */
  onConfirm: () => Promise<void>;
  /**
   * Records the dismissal, with its structured reason. Awaited by the modal, which shows the
   * Decline button's own loading state for as long as this takes — omitted by hosts that cannot
   * record one, which also hides the modal's Decline trigger rather than leaving it inert.
   */
  onDismiss?: (params: DeclineParams) => Promise<void>;
  /**
   * Whether this proposal's approve/decline is currently in flight. Sourced from the host's own
   * mutation cache (e.g. `useIsMutating`) rather than tracked here, so this row and the modal it
   * opens agree even across the modal being closed and reopened mid-submission.
   */
  isSubmitting?: 'applying' | 'declining';
  /** Who's approving/declining, for the modal's "Applying"/"Declining" caption. */
  currentActorName?: string;
  'data-test-subj'?: string;
}

const PENDING_BADGE = {
  color: 'primary' as const,
  iconType: 'clock' as const,
  label: DETAILS_FLYOUT_LABELS.proposedAction.needsReviewBadge,
  isLoading: false,
};

/**
 * A row in the flyout's "Proposed actions" list.
 *
 * Always clickable: it opens the same {@link ApprovalModal} the conversation card's
 * recommended-action menu item opens (see `onClickRecommendedAction` in `BaseActions`), so a
 * proposal reads and decides identically whether it was reached from the queue or from inside its
 * own flyout. For a decided proposal that modal is read-only — the badge reports the outcome and
 * who/when decided it, and there is nothing left to submit.
 *
 * Reads `isSubmitting` for its transient "Applying"/"Declining" phase — the same
 * {@link getApprovalOutcomeBadge} source of truth the modal itself reads, so the row behind the
 * modal shows the submission in progress too, not just the modal's own header badge.
 */
export const ProposedActionButton = memo<ProposedActionButtonProps>(
  ({
    readOnly = false,
    proposal,
    onConfirm,
    onDismiss,
    isSubmitting,
    currentActorName,
    'data-test-subj': dataTestSubj,
  }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const decision = getProposalDecision(proposal);

    const openModal = useCallback(() => setIsModalOpen(true), []);
    const closeModal = useCallback(() => setIsModalOpen(false), []);

    const approvalPhase: ApprovalPhase = decision ? decision.status : isSubmitting ?? 'pending';

    const badge = getApprovalOutcomeBadge(approvalPhase) ?? PENDING_BADGE;
    const isInteractive = !decision && !isSubmitting;

    const pendingCaption = getProposalCaption(proposal);

    // A decision with no `actorName` is a terminal state nobody actually decided (expired,
    // chiefly) — the badge label alone ("Expired") already says what happened, so this only adds
    // "by {name}" when there is a real actor to name.
    const caption = decision?.actorName ? (
      <ApprovalActorTime
        actorName={decision.actorName}
        at={decision.decidedAt}
        outcome={
          decision.status === 'failed'
            ? 'executed'
            : decision.status === 'declined'
            ? 'declined'
            : 'approved'
        }
      />
    ) : decision ? (
      badge.label
    ) : pendingCaption ? (
      pendingCaption
    ) : (
      getEmptyValue()
    );

    const { euiTheme } = useEuiTheme();
    const borderStyle = `1px solid ${euiTheme.colors.backgroundLightText}`;
    return (
      <>
        <EuiPanel
          hasBorder={false}
          hasShadow={false}
          paddingSize="m"
          role="button"
          tabIndex={0}
          aria-label={DETAILS_FLYOUT_LABELS.proposedAction.ariaLabel({
            title: proposal.title,
            status: badge.label,
          })}
          data-test-subj={dataTestSubj}
          css={css({
            borderRadius: 0,
            '&:first-child': {
              borderRadius: `${euiTheme.size.m} ${euiTheme.size.m} 0 0`,
              border: borderStyle,
            },
            '&:not(:first-child):not(:last-child)': {
              borderLeft: borderStyle,
              borderRight: borderStyle,
              borderBottom: borderStyle,
            },
            '&:last-child': {
              border: borderStyle,
              borderTop: 'none',
              borderRadius: `0 0 ${euiTheme.size.m} ${euiTheme.size.m}`,
            },
            // Must come after first/last so a lone item gets a full border and radius
            '&:only-child': {
              border: borderStyle,
              borderRadius: euiTheme.size.m,
            },
            cursor: isInteractive ? 'pointer' : 'default',
            ...(isInteractive
              ? { '&:hover': { backgroundColor: euiTheme.colors.backgroundBaseSubdued } }
              : {}),
          })}
          onClick={openModal}
          onKeyDown={(event: React.KeyboardEvent) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              openModal();
            }
          }}
        >
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiFlexItem>
              <EuiFlexGroup
                alignItems="center"
                justifyContent="spaceBetween"
                gutterSize="s"
                responsive={false}
              >
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <strong>{proposal.title}</strong>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <ProposedActionStatusBadge
                    color={badge.color}
                    iconType={badge.iconType}
                    label={badge.label}
                    isLoading={badge.isLoading}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            {caption && (
              <EuiFlexItem>
                <EuiText size="xs" color="subdued">
                  {caption}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiPanel>

        {isModalOpen && (
          <ApprovalModal
            proposal={proposal}
            readOnly={readOnly}
            onConfirm={onConfirm}
            onClose={closeModal}
            onDismiss={onDismiss}
            isSubmitting={isSubmitting}
            currentActorName={currentActorName}
            data-test-subj={dataTestSubj ? `${dataTestSubj}-modal` : undefined}
          />
        )}
      </>
    );
  }
);

ProposedActionButton.displayName = 'ProposedActionButton';
