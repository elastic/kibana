/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiText,
  EuiToolTip,
  euiTextTruncate,
  useEuiMemoizedStyles,
  type UseEuiTheme,
} from '@elastic/eui';
import {
  ApprovalActorTime,
  ApprovalModal,
  getApprovalOutcomeBadge,
  getSubmittingPhase,
  isProposalReplaced,
  hasDeadlinePassed,
  getProposalCaption,
  ProposalCaption,
  getProposalDecision,
  ProposedActionStatusBadge,
  type ApprovalPhase,
  type ApprovalProposal,
  type DeclineParams,
} from '@kbn/proposals-ui';
import { DETAILS_FLYOUT_LABELS } from './translations';
import { useIsTextTruncated } from '../use_is_text_truncated';

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
  isDisabled: false,
};

const RESTRICTED_BADGE = {
  color: 'warning' as const,
  iconType: 'lock' as const,
  label: DETAILS_FLYOUT_LABELS.proposedAction.restrictedBadge,
  isLoading: false,
  isDisabled: false,
};

/**
 * A native button styled like a "What's happened" row (`GroupedAttachmentRow`), rather than a
 * clickable `EuiPanel` — that lifts and casts a shadow on hover, which sits oddly next to the
 * flat background tint the rows above it use. The border, radius and dividers belong to the
 * surrounding `ProposedActionsList`.
 */
const rowStyles = ({ euiTheme }: UseEuiTheme) => ({
  // The row's button and, for a retry, the icon beside it: the list item carries the hover tint so
  // both sit on it, and each keeps the base padding on its own sides.
  item: css`
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    transition: background ${euiTheme.animation.fast} ${euiTheme.animation.resistance};

    &:hover,
    &:focus-within {
      background-color: ${euiTheme.colors.backgroundBaseSubdued};
    }
  `,
  row: css`
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    column-gap: ${euiTheme.size.s};
    align-items: center;
    box-sizing: border-box;
    inline-size: 100%;
    padding: ${euiTheme.size.base};
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: start;
    cursor: pointer;

    &:focus-visible {
      outline: ${euiTheme.focus.width} solid ${euiTheme.focus.color};
      outline-offset: -${euiTheme.focus.width};
    }
  `,
  text: css`
    display: flex;
    flex-direction: column;
    gap: ${euiTheme.size.xs};
    min-inline-size: 0;
  `,
  title: css`
    display: block;
    ${euiTextTruncate()}
  `,
  // The tooltip anchor must stretch like the button it wraps, or the grid collapses to content.
  // 8px between the badge and the retry icon beside it.
  rowWithRetry: css`
    padding-inline-end: ${euiTheme.size.s};
  `,
  retry: css`
    margin-inline-end: ${euiTheme.size.base};
  `,
  noType: css`
    color: ${euiTheme.colors.textDisabled};
  `,
  tooltipAnchor: css`
    display: block;
    min-inline-size: 0;
  `,
});

/**
 * A row in the flyout's "Proposed actions" list — a `<li>` meant for a `ProposedActionsList`.
 *
 * Always clickable: it opens the same {@link ApprovalModal} the conversation card's
 * recommended-action menu item opens (see `onClickRecommendedAction` in `BaseActions`), so a
 * proposal reads and decides identically whether it was reached from the queue or from inside its
 * own flyout. For a decided proposal that modal is read-only — the badge reports the outcome and
 * who/when decided it, and there is nothing left to submit — so hover feedback is the same for
 * every row rather than suggesting a decided one is inert.
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

    const approvalPhase: ApprovalPhase = decision
      ? decision.status
      : isSubmitting
      ? getSubmittingPhase(isSubmitting)
      : 'pending';

    // Only an undecided proposal is restricted: a decided one reports its outcome to everyone.
    const isRestricted = readOnly && approvalPhase === 'pending';
    // Still undecided, but offered again after a run of its action failed: the row says so and
    // offers the retry, which is the same approval the modal's Approve button submits.
    const isRetry =
      !readOnly && approvalPhase === 'pending' && Boolean(proposal.previousExecutionError);

    const badge = isRestricted
      ? RESTRICTED_BADGE
      : isRetry
      ? getApprovalOutcomeBadge('failed') ?? PENDING_BADGE
      : getApprovalOutcomeBadge(approvalPhase) ?? PENDING_BADGE;

    const pendingCaption = getProposalCaption(proposal) && <ProposalCaption proposal={proposal} />;

    // Who and when, worded the same in every state and in the modal header too: the saved
    // decision when there is one, else the current user from when their click went out. A
    // decision with no `actorName` is one nobody made (expired, chiefly) — the badge label alone
    // ("Expired") already says what happened — and so is an expired proposal that has an actor.
    const [submittedAt, setSubmittedAt] = useState<string | undefined>();
    useEffect(() => {
      setSubmittedAt(isSubmitting ? new Date().toISOString() : undefined);
    }, [isSubmitting]);
    const actorName =
      decision?.status === 'expired' || decision?.status === 'outdated'
        ? undefined
        : decision?.actorName ?? (isSubmitting ? currentActorName : undefined);
    const actedAt = decision?.decidedAt ?? submittedAt;

    // A failed record says why it failed, in red, rather than who acted: the badge already says "Failed".
    const failureReason = decision?.status === 'failed' ? decision.reason : undefined;
    // A decline says why, rather than who — or that no reason was given.
    const hasDeclineReason =
      (proposal.dismissReason && proposal.dismissReason !== 'no_reason') || proposal.rationale;
    const declineReason =
      decision?.status === 'declined'
        ? hasDeclineReason
          ? decision.reason
          : DETAILS_FLYOUT_LABELS.proposedAction.noReasonCaption
        : undefined;
    const isFailure = isRetry || decision?.status === 'failed';
    const isExpired = decision?.status === 'expired' || decision?.status === 'outdated';
    // Why it expired: replaced by a successor, else the gate's own reason when it left one, else
    // that nobody decided in time.
    const expiredReason = isExpired
      ? isProposalReplaced(proposal)
        ? DETAILS_FLYOUT_LABELS.proposedAction.expiredReplacedCaption
        : proposal.rationale ||
          // Settled before its deadline (a failed workflow, say), so it did not time out.
          (proposal.expiresAt && !hasDeadlinePassed(proposal)
            ? DETAILS_FLYOUT_LABELS.proposedAction.expiredGenericCaption
            : DETAILS_FLYOUT_LABELS.proposedAction.expiredTimedOutCaption)
      : undefined;

    // Nothing to say about the action itself: the caption says so, in a disabled colour, rather
    // than leaving a bare dash.
    const hasNoType =
      !failureReason &&
      !pendingCaption &&
      !isFailure &&
      !(approvalPhase === 'approving' || actorName || isRestricted || decision);

    const caption = isRetry ? (
      // Offered again after a failed attempt: the row invites another go, and the modal says why.
      DETAILS_FLYOUT_LABELS.proposedAction.retryCaption
    ) : expiredReason ? (
      expiredReason
    ) : failureReason ? (
      failureReason
    ) : declineReason ? (
      declineReason
    ) : hasNoType ? (
      DETAILS_FLYOUT_LABELS.proposedAction.noTypeCaption
    ) : isFailure ? (
      // No reason on record: the caption says so, in the failure colour.
      DETAILS_FLYOUT_LABELS.proposedAction.noFailureReasonCaption
    ) : approvalPhase === 'approving' ? (
      // Not yet recorded, so there is no decision to attribute: the row waits on the server.
      DETAILS_FLYOUT_LABELS.proposedAction.awaitingApprovalCaption
    ) : actorName ? (
      <ApprovalActorTime actorName={actorName} at={actedAt} isUnknown={decision?.isActorUnknown} />
    ) : isRestricted ? (
      DETAILS_FLYOUT_LABELS.proposedAction.restrictedCaption
    ) : decision ? (
      badge.label
    ) : (
      pendingCaption
    );

    // Captions that only say something is missing read in the disabled text colour.
    const isMuted =
      hasNoType ||
      (decision?.status === 'declined' && !hasDeclineReason) ||
      (!isRetry && decision?.status === 'failed' && !failureReason);

    const [titleElement, setTitleElement] = useState<HTMLSpanElement | null>(null);
    const isTitleTruncated = useIsTextTruncated(titleElement, proposal.title);
    const styles = useEuiMemoizedStyles(rowStyles);

    const button = (
      <button
        type="button"
        aria-label={DETAILS_FLYOUT_LABELS.proposedAction.ariaLabel({
          title: proposal.title,
          status: badge.label,
        })}
        data-test-subj={dataTestSubj}
        css={[styles.row, isRetry && styles.rowWithRetry]}
        onClick={openModal}
      >
        <span css={styles.text}>
          <span ref={setTitleElement} css={styles.title}>
            <EuiText size="s" component="span">
              <strong>{proposal.title}</strong>
            </EuiText>
          </span>
          {caption && (
            <EuiText
              size="xs"
              color={
                isMuted
                  ? 'subdued'
                  : isRestricted || isExpired
                  ? 'warning'
                  : isFailure
                  ? 'danger'
                  : 'subdued'
              }
              component="span"
              css={[
                (isFailure || declineReason || expiredReason) && styles.title,
                isMuted && styles.noType,
              ]}
            >
              {caption}
            </EuiText>
          )}
        </span>
        <ProposedActionStatusBadge
          color={badge.color}
          iconType={badge.iconType}
          label={badge.label}
          isLoading={badge.isLoading}
          isDisabled={badge.isDisabled}
        />
      </button>
    );

    const retryButton = isRetry && (
      // Positioned on the tooltip's own anchor: left in flow, it adds a line below the row.
      <EuiToolTip
        content={DETAILS_FLYOUT_LABELS.proposedAction.retryTooltip}
        // The button's own aria-label says the same, so the tooltip is not read out twice.
        disableScreenReaderOutput
        position="top"
        anchorProps={{ css: styles.retry }}
      >
        <EuiButtonIcon
          iconType="refresh"
          color="primary"
          size="xs"
          iconSize="m"
          aria-label={DETAILS_FLYOUT_LABELS.proposedAction.retryTooltip}
          // The host surfaces a rejection itself (a toast), so it is not repeated here.
          onClick={() => onConfirm().catch(() => {})}
          data-test-subj={dataTestSubj ? `${dataTestSubj}-retry` : undefined}
        />
      </EuiToolTip>
    );

    return (
      <li css={styles.item}>
        {/* Anchored on the button itself, so keyboard focus reveals the full title too. */}
        {isTitleTruncated ? (
          <EuiToolTip
            content={proposal.title}
            position="top"
            anchorProps={{ css: styles.tooltipAnchor }}
          >
            {button}
          </EuiToolTip>
        ) : (
          button
        )}

        {retryButton}

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
      </li>
    );
  }
);

ProposedActionButton.displayName = 'ProposedActionButton';
