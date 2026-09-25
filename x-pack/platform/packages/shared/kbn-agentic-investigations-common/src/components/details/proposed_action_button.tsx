/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText, useEuiTheme } from '@elastic/eui';
import { FormattedMessage, FormattedTime } from '@kbn/i18n-react';
import type { DismissReason } from '@kbn/proposals-common';
import {
  ApprovalModal,
  getApprovalOutcomeBadge,
  getProposalCaption,
  getProposalDecision,
  getProposalTitle,
  ProposedActionStatusBadge,
  type ApprovalPhase,
  type ApprovalProposal,
} from '@kbn/proposals-ui';
import { DETAILS_FLYOUT_LABELS } from './translations';
import { getEmptyValue } from '../helpers';

export interface DismissProposalParams {
  dismissReason: DismissReason;
  rationale: string;
}

export interface ProposedActionButtonProps {
  /** Same shape the card's recommended-action menu item reads its proposal from. */
  proposal: ApprovalProposal;
  /** Commits the approval — pass the mutation's own promise (`mutateAsync`). */
  onConfirm: () => Promise<void>;
  /**
   * Records the dismissal. Omitted by hosts that cannot record a dismissal, which also hides the
   * modal's Dismiss button.
   */
  onDismiss?: (params: DismissProposalParams) => Promise<void>;
  /**
   * Renders the host's own dismiss-reason modal once the analyst clicks Decline. `onConfirm` here
   * is this row's own wrapper around `onDismiss` above — wiring the host's modal to it, rather
   * than straight to the mutation, is what lets the row's badge track the same submission.
   */
  renderDismissModal?: (props: {
    onClose: () => void;
    onConfirm: (params: DismissProposalParams) => Promise<void>;
  }) => React.ReactNode;
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
    proposal,
    onConfirm,
    onDismiss,
    renderDismissModal,
    isSubmitting,
    currentActorName,
    'data-test-subj': dataTestSubj,
  }) => {
    const { euiTheme } = useEuiTheme();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDismissModalOpen, setIsDismissModalOpen] = useState(false);
    const decision = getProposalDecision(proposal);

    const openModal = useCallback(() => setIsModalOpen(true), []);
    const closeModal = useCallback(() => setIsModalOpen(false), []);
    const closeDismissModal = useCallback(() => setIsDismissModalOpen(false), []);

    // The approval modal's own Dismiss hands off to the host's dismiss-reason modal rather than
    // recording anything itself — closing one and opening the other keeps exactly one open.
    const openDismissModal = useCallback(() => {
      closeModal();
      setIsDismissModalOpen(true);
    }, [closeModal]);

    const wrappedOnDismiss = useCallback(
      async (params: DismissProposalParams) => {
        if (!onDismiss) {
          return;
        }
        await onDismiss(params);
        closeDismissModal();
      },
      [onDismiss, closeDismissModal]
    );

    const approvalPhase: ApprovalPhase = decision ? decision.status : isSubmitting ?? 'pending';

    const badge = getApprovalOutcomeBadge(approvalPhase) ?? PENDING_BADGE;
    const isInteractive = !decision && !isSubmitting;

    const pendingCaption = getProposalCaption(proposal);

    const caption = decision ? (
      decision.decidedAt ? (
        <FormattedMessage
          id="xpack.alertzero.detailsFlyout.proposedAction.decidedByCaption"
          defaultMessage="{approvalType} by {name} at {time}"
          values={{
            approvalType: badge.label,
            name: decision.actorName,
            time: <FormattedTime value={decision.decidedAt} />,
          }}
        />
      ) : (
        <FormattedMessage
          id="xpack.alertzero.detailsFlyout.proposedAction.decidedByCaptionWithoutTime"
          defaultMessage="{approvalType} by {name}"
          values={{ approvalType: badge.label, name: decision.actorName }}
        />
      )
    ) : Boolean(pendingCaption) ? (
      pendingCaption
    ) : (
      getEmptyValue()
    );

    return (
      <>
        <EuiPanel
          hasBorder
          paddingSize="m"
          role="button"
          tabIndex={0}
          aria-label={DETAILS_FLYOUT_LABELS.proposedAction.ariaLabel}
          data-test-subj={dataTestSubj}
          css={css({
            borderRadius: euiTheme.border.radius.medium,
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
                    <strong>{getProposalTitle(proposal)}</strong>
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
            onConfirm={onConfirm}
            onClose={closeModal}
            onDismiss={onDismiss ? openDismissModal : undefined}
            isSubmitting={isSubmitting}
            currentActorName={currentActorName}
            data-test-subj={dataTestSubj ? `${dataTestSubj}-modal` : undefined}
          />
        )}

        {isDismissModalOpen &&
          renderDismissModal?.({ onClose: closeDismissModal, onConfirm: wrappedOnDismiss })}
      </>
    );
  }
);

ProposedActionButton.displayName = 'ProposedActionButton';
