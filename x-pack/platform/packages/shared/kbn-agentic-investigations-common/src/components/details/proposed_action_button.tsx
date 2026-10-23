/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiText,
  EuiToolTip,
  euiTextTruncate,
  useEuiMemoizedStyles,
  type UseEuiTheme,
} from '@elastic/eui';
import {
  ApprovalActorTime,
  ApprovalModal,
  getProposalBadge,
  getProposalPhase,
  getExpiredCaption,
  getProposalCaption,
  ProposalCaption,
  getProposalDecision,
  ProposedActionStatusBadge,
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
  /** Marks a to-do proposal that was marked as applied as not applied, from the modal. */
  onReopen?: () => Promise<void>;
  isReopening?: boolean;
  'data-test-subj'?: string;
}

/**
 * A native button styled like a "What's happened" row (`GroupedAttachmentRow`), rather than a
 * clickable `EuiPanel` — that lifts and casts a shadow on hover, which sits oddly next to the
 * flat background tint the rows above it use. The border, radius and dividers belong to the
 * surrounding `ProposedActionsList`.
 */
const rowStyles = ({ euiTheme }: UseEuiTheme) => ({
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
    transition: background ${euiTheme.animation.fast} ${euiTheme.animation.resistance};

    &:hover,
    &:focus-visible {
      background-color: ${euiTheme.colors.backgroundBaseSubdued};
    }

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
    onReopen,
    isReopening,
    'data-test-subj': dataTestSubj,
  }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const decision = getProposalDecision(proposal);

    const openModal = useCallback(() => setIsModalOpen(true), []);
    const closeModal = useCallback(() => setIsModalOpen(false), []);

    const approvalPhase = getProposalPhase(proposal, isSubmitting);

    // Only an undecided proposal is restricted: a decided one reports its outcome to everyone.
    const isRestricted = readOnly && approvalPhase === 'pending';

    // The same badge the modal shows in its header.
    const badge = getProposalBadge(proposal, { readOnly, isSubmitting });

    const pendingCaption = getProposalCaption(proposal) && <ProposalCaption proposal={proposal} />;

    // Who and when: the saved decision when there is one, else the current user from when their
    // click went out. A decision with no `actorName` is one nobody made (expired, chiefly) — the
    // badge label alone ("Expired") already says what happened — and so is an expired proposal
    // that has an actor. Only a start seen after mount is timed: a row that mounts already
    // submitting (a reopened flyout) does not know when it began, so shows no time.
    const [submittedAt, setSubmittedAt] = useState<string | undefined>();
    const wasSubmitting = useRef(isSubmitting);
    useEffect(() => {
      if (!isSubmitting) {
        setSubmittedAt(undefined);
      } else if (!wasSubmitting.current) {
        setSubmittedAt(new Date().toISOString());
      }
      wasSubmitting.current = isSubmitting;
    }, [isSubmitting]);
    const actorName =
      decision?.status === 'expired'
        ? undefined
        : decision?.actorName ?? (isSubmitting ? currentActorName : undefined);
    const actedAt = decision?.decidedAt ?? submittedAt;

    const isExpired = decision?.status === 'expired';
    // Why it can no longer be decided: the same text the modal's callout repeats.
    const expiredReason = isExpired ? getExpiredCaption(proposal) : undefined;

    // Nothing to say about the action itself: the caption says so, in a disabled colour, rather
    // than leaving a bare dash.
    const hasNoType = !pendingCaption && !(actorName || isRestricted || decision);

    const caption = expiredReason ? (
      expiredReason
    ) : hasNoType ? (
      DETAILS_FLYOUT_LABELS.proposedAction.noTypeCaption
    ) : actorName ? (
      <ApprovalActorTime
        actorName={actorName}
        at={actedAt}
        isUnknown={decision?.isActorUnknown}
        live={approvalPhase === 'applying' || approvalPhase === 'declining'}
      />
    ) : isRestricted ? (
      DETAILS_FLYOUT_LABELS.proposedAction.restrictedCaption
    ) : decision ? (
      badge.label
    ) : (
      pendingCaption
    );

    const [titleElement, setTitleElement] = useState<HTMLSpanElement | null>(null);
    const isTitleTruncated = useIsTextTruncated(titleElement, proposal.title);
    // A reason (an error, a decline, why it expired) can be as long as whoever wrote it, so it is
    // cut to one line too. Only plain-text captions are measured; the rest are short components.
    const captionText = typeof caption === 'string' ? caption : undefined;
    const [captionElement, setCaptionElement] = useState<HTMLSpanElement | null>(null);
    const isCaptionTruncated = useIsTextTruncated(captionElement, captionText ?? '');
    const styles = useEuiMemoizedStyles(rowStyles);

    const button = (
      <button
        type="button"
        aria-label={DETAILS_FLYOUT_LABELS.proposedAction.ariaLabel({
          title: proposal.title,
          status: badge.label,
        })}
        data-test-subj={dataTestSubj}
        css={styles.row}
        onClick={openModal}
      >
        <span css={styles.text}>
          <span ref={setTitleElement} css={styles.title}>
            <EuiText size="s" component="span">
              <strong>{proposal.title}</strong>
            </EuiText>
          </span>
          {caption && (
            <span ref={setCaptionElement} css={captionText !== undefined && styles.title}>
              <EuiText
                size="xs"
                color={!hasNoType && (isRestricted || isExpired) ? 'warning' : 'subdued'}
                component="span"
                css={hasNoType && styles.noType}
              >
                {caption}
              </EuiText>
            </span>
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

    return (
      <li>
        {/* Anchored on the button itself, so keyboard focus reveals the full text too. One tooltip
            for the pair: the title, and under it the reason when that is cut off as well. */}
        {isTitleTruncated || isCaptionTruncated ? (
          <EuiToolTip
            content={
              isCaptionTruncated ? (
                <>
                  <strong>{proposal.title}</strong>
                  <br />
                  {captionText}
                </>
              ) : (
                proposal.title
              )
            }
            position="top"
            anchorProps={{ css: styles.tooltipAnchor }}
          >
            {button}
          </EuiToolTip>
        ) : (
          button
        )}

        {isModalOpen && (
          <ApprovalModal
            proposal={proposal}
            readOnly={readOnly}
            onConfirm={onConfirm}
            onClose={closeModal}
            onDismiss={onDismiss}
            isSubmitting={isSubmitting}
            submittedAt={submittedAt}
            currentActorName={currentActorName}
            onReopen={onReopen}
            isReopening={isReopening}
            data-test-subj={dataTestSubj ? `${dataTestSubj}-modal` : undefined}
          />
        )}
      </li>
    );
  }
);

ProposedActionButton.displayName = 'ProposedActionButton';
