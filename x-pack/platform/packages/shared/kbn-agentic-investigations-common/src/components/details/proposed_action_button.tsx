/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
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
  getApprovalOutcomeBadge,
  getProposalCaption,
  ProposalCaption,
  getProposalDecision,
  ProposedActionStatusBadge,
  type ApprovalPhase,
  type ApprovalProposal,
  type DeclineParams,
} from '@kbn/proposals-ui';
import type { IBasePath } from '@kbn/core-http-browser';
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
  /** Who's approving/declining, for the modal's "Applying"/"Declining" banner. */
  currentActorName?: string;
  /** Marks a to-do proposal that was marked as applied as not applied, from the modal. */
  onReopen?: () => Promise<void>;
  isReopening?: boolean;
  /**
   * See `ApprovalModalProps.basePath`. Supplied by the caller: flyout slots render outside a
   * `KibanaContextProvider`, so this package cannot read `core.http` itself.
   */
  basePath?: IBasePath;
  'data-test-subj'?: string;
}

/** The outcomes someone decided, so the caption names who and when; the badge says which. */
const ACTOR_CAPTION_PHASES: ReadonlySet<ApprovalPhase> = new Set<ApprovalPhase>([
  'applied',
  'applying',
  // A to-do proposal, marked as applied by the human who carried it out.
  'marked_applied',
  'no_action',
  'declined',
  'failed',
]);

const PENDING_BADGE = {
  color: 'primary' as const,
  iconType: 'eye' as const,
  label: DETAILS_FLYOUT_LABELS.proposedAction.needsReviewBadge,
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
  noType: css`
    color: ${euiTheme.colors.textDisabled};
  `,
  // The tooltip anchor must stretch like the button it wraps, or the grid collapses to content.
  tooltipAnchor: css`
    display: block;
    min-inline-size: 0;
  `,
});

/**
 * A row in the flyout's "Proposed actions" list — a `<li>` meant for a `ProposedActionsList`.
 *
 * Always clickable: it opens the {@link ApprovalModal}, the one place a proposal is read and
 * decided. For a decided proposal that modal is read-only — the badge reports the outcome and
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
    basePath,
    'data-test-subj': dataTestSubj,
  }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const decision = getProposalDecision(proposal);

    const openModal = useCallback(() => setIsModalOpen(true), []);
    const closeModal = useCallback(() => setIsModalOpen(false), []);

    const approvalPhase: ApprovalPhase = decision ? decision.status : isSubmitting ?? 'pending';

    const badge = getApprovalOutcomeBadge(approvalPhase) ?? PENDING_BADGE;

    const pendingCaption = getProposalCaption(proposal) && <ProposalCaption proposal={proposal} />;

    // A decision with no `actorName` is a terminal state nobody actually decided (expired,
    // chiefly), so this only names "who • when" when there is a real actor to name. An expired
    // proposal says why it can no longer be decided instead, since the badge already says
    // "Expired".
    const isExpired = decision?.status === 'expired';
    const hasNoType = !decision && !pendingCaption;
    const caption =
      decision?.actorName && ACTOR_CAPTION_PHASES.has(decision.status) ? (
        <ApprovalActorTime
          actorName={decision.actorName}
          at={decision.decidedAt}
          live={decision.status === 'applying'}
        />
      ) : isExpired ? (
        proposal.rationale || DETAILS_FLYOUT_LABELS.proposedAction.expiredCaption
      ) : hasNoType ? (
        DETAILS_FLYOUT_LABELS.proposedAction.noTypeCaption
      ) : (
        pendingCaption
      );

    const [titleElement, setTitleElement] = useState<HTMLSpanElement | null>(null);
    const isTitleTruncated = useIsTextTruncated(titleElement, proposal.title);
    // A saved reason is as long as whoever wrote it, so it is cut to one line like the title.
    const captionText = typeof caption === 'string' ? caption : undefined;
    const [captionElement, setCaptionElement] = useState<HTMLSpanElement | null>(null);
    const isCaptionTruncated =
      useIsTextTruncated(captionElement, captionText ?? '') && captionText !== undefined;
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
                color={isExpired ? 'warning' : 'subdued'}
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
            for both: the title, and under it the caption when that is cut off as well. */}
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
            currentActorName={currentActorName}
            onReopen={onReopen}
            isReopening={isReopening}
            basePath={basePath}
            data-test-subj={dataTestSubj ? `${dataTestSubj}-modal` : undefined}
          />
        )}
      </li>
    );
  }
);

ProposedActionButton.displayName = 'ProposedActionButton';
