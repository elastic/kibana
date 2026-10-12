/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import { EuiText, EuiToolTip, euiTextTruncate, useEuiTheme, useResizeObserver } from '@elastic/eui';
import { FormattedMessage, FormattedTime } from '@kbn/i18n-react';
import {
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
    ) : decision ? (
      badge.label
    ) : pendingCaption ? (
      pendingCaption
    ) : (
      getEmptyValue()
    );

    // Same truncation-with-tooltip pattern as `GroupedAttachmentRow`: the full title is only
    // worth a tooltip once the row is actually too narrow to show it.
    const [titleElement, setTitleElement] = useState<HTMLSpanElement | null>(null);
    const { width: titleWidth } = useResizeObserver(titleElement, 'width');
    const [isTitleTruncated, setIsTitleTruncated] = useState(false);

    useEffect(() => {
      setIsTitleTruncated(
        titleElement ? titleElement.scrollWidth > titleElement.clientWidth : false
      );
    }, [titleElement, titleWidth, proposal.title]);

    const { euiTheme } = useEuiTheme();
    const borderStyle = `1px solid ${euiTheme.colors.backgroundLightText}`;

    // A native button styled like a "What's happened" row (`GroupedAttachmentRow`), rather than a
    // clickable `EuiPanel` — that lifts and casts a shadow on hover, which sits oddly next to the
    // flat background tint the rows above it use.
    const rowStyles = css`
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      column-gap: ${euiTheme.size.s};
      align-items: center;
      box-sizing: border-box;
      inline-size: 100%;
      padding: ${euiTheme.size.base};
      border: 0;
      border-radius: 0;
      background: ${euiTheme.colors.emptyShade};
      color: inherit;
      font: inherit;
      text-align: start;
      cursor: ${isInteractive ? 'pointer' : 'default'};
      transition: background 0.15s ease;

      &:first-child {
        border: ${borderStyle};
        border-radius: ${euiTheme.size.m} ${euiTheme.size.m} 0 0;
      }

      &:not(:first-child):not(:last-child) {
        border-left: ${borderStyle};
        border-right: ${borderStyle};
        border-bottom: ${borderStyle};
      }

      &:last-child {
        border: ${borderStyle};
        border-top: 0;
        border-radius: 0 0 ${euiTheme.size.m} ${euiTheme.size.m};
      }

      /* Must come after first/last so a lone item gets a full border and radius */
      &:only-child {
        border: ${borderStyle};
        border-radius: ${euiTheme.size.m};
      }

      ${isInteractive
        ? `
      &:hover,
      &:focus-visible {
        background-color: ${euiTheme.colors.backgroundBaseSubdued};
      }
      `
        : ''}

      &:focus-visible {
        outline: ${euiTheme.focus.width} solid ${euiTheme.focus.color};
        outline-offset: -${euiTheme.focus.width};
      }
    `;

    const textStyles = css`
      display: flex;
      flex-direction: column;
      gap: ${euiTheme.size.xs};
      min-inline-size: 0;
    `;

    const titleStyles = css`
      display: block;
      ${euiTextTruncate()}
    `;

    const titleNode = (
      <span ref={setTitleElement} css={titleStyles}>
        <EuiText size="s" component="span">
          <strong>{proposal.title}</strong>
        </EuiText>
      </span>
    );

    return (
      <>
        <button
          type="button"
          aria-label={DETAILS_FLYOUT_LABELS.proposedAction.ariaLabel({
            title: proposal.title,
            status: badge.label,
          })}
          data-test-subj={dataTestSubj}
          css={rowStyles}
          onClick={openModal}
        >
          <span css={textStyles}>
            {isTitleTruncated ? (
              <EuiToolTip
                content={proposal.title}
                position="top"
                anchorProps={{ css: css({ display: 'block', minInlineSize: 0 }) }}
              >
                {titleNode}
              </EuiToolTip>
            ) : (
              titleNode
            )}
            {caption && (
              <EuiText size="xs" color="subdued" component="span">
                {caption}
              </EuiText>
            )}
          </span>
          <ProposedActionStatusBadge
            color={badge.color}
            iconType={badge.iconType}
            label={badge.label}
            isLoading={badge.isLoading}
          />
        </button>

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
