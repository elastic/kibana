/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { type EuiButtonColor, useGeneratedHtmlId } from '@elastic/eui';
import { isTodoProposal, type DismissReason } from '@kbn/proposals-common';
import { ApprovalContentHeader } from './approval_content_header';
import { AlwaysAllowCheckbox } from './always_allow_checkbox';
import { DeclineReasonForm } from './decline_reason_form';
import { ApprovalContentBody } from './approval_content_body';
import { ApprovalStatusCallouts } from './approval_status_callouts';
import { ApprovalContentFooter } from './approval_content_footer';
import { getApprovalOutcomeBanner } from './approval_outcome';
import { APPROVAL_MODAL_TRANSLATIONS } from './translations';
import { getProposalBadge } from './proposal_badge';
import {
  formatDateTime,
  getProposalCaption,
  getProposalDecision,
  getProposalTone,
  isProposalExpired,
  isProposalReplaced,
  getExpiredCaption,
  getProposalPhase,
} from './proposal_helpers';
import { ProposalCaption } from './proposal_caption';
import type { ApprovalAction, AlwaysAllowOption, DeclineParams, ApprovalProposal } from './types';

export interface ApprovalContentProps {
  /**
   * The proposal this asks for a decision on. Title, tone, comment, header caption, decision and
   * expiry are all derived from it internally, the same way for every host, rather than each host
   * computing them itself and risking a subtle divergence (as the chat card's Approve button once
   * did, styled `success` where the flyout modal's read `primary`).
   */
  proposal: ApprovalProposal;
  titleId?: string;
  /**
   * Whether this proposal's approve/decline is currently in flight. Sourced from the host's own
   * mutation cache (e.g. `useIsMutating`) rather than tracked here — a local `useState` would not
   * survive this component being unmounted and remounted mid-submission (closing and reopening
   * the modal, say), and would have no way to agree with another component showing the same
   * proposal (the flyout row this modal opened from, for instance).
   */
  isSubmitting?: 'applying' | 'declining';
  /** ISO timestamp the host started the in-flight approve/decline at, if it knows it. */
  submittedAt?: string;
  /**
   * Who is submitting right now, for the Applying and Declining banners. Falls back to a
   * generic "You" when omitted, so a host that has not wired a profile lookup still gets a
   * coherent transient state.
   */
  currentActorName?: string;
  alwaysAllow?: AlwaysAllowOption;
  /**
   * Disables the Approve/Decline actions without hiding them, so a host that only lacks
   * permission right now (rather than always) still shows the analyst what would otherwise be
   * offered.
   */
  readOnly?: boolean;
  /**
   * Approves the proposal. Rendered as a filled `EuiButton` labeled "Approve" ("Mark as applied" for a
   * to-do proposal, see `isTodoProposal`), disabled once the
   * proposal has expired — both derived here rather than supplied by the caller, so every host's
   * Approve button behaves and reads identically. Omit for a host that cannot record an approval,
   * which hides the button entirely rather than leaving it inert.
   */
  onApprove?: () => void | Promise<void>;
  /** Each entry rendered as an `EuiButtonEmpty`, alongside Approve/Decline. */
  secondaryActions?: ApprovalAction[];
  /**
   * Enables the built-in decline flow. When set, a "Decline" trigger appears next to the Approve
   * button; clicking it swaps the body for `DeclineReasonForm` and the footer for Cancel/Decline,
   * entirely within this component — so a host never renders `DeclineReasonForm` itself or tracks
   * its own declining mode. The same flow renders identically whether this is placed inside a
   * modal or an Agent Builder chat card. Disabled whenever the Approve button is. A to-do
   * proposal (`isTodoProposal`) offers it next to "Mark as applied".
   */
  onDismiss?: (params: DeclineParams) => Promise<void>;
  /**
   * Marks a to-do proposal that was marked as applied as not applied again. When set, such a
   * proposal shows a "Mark as not applied" action in place of the footer it no longer has.
   * Disabled with `readOnly`; a rejection is shown in the card like a failed decision.
   */
  onReopen?: () => Promise<void>;
  /** Whether this proposal's `onReopen` is in flight, from the host's mutation cache. */
  isReopening?: boolean;
  'data-test-subj'?: string;
}

/**
 * The proposal-specific approval UI, shared by the AlertZero flyout's modal and the Agent Builder
 * chat card.
 *
 * Renders as a React Fragment so it can be placed inside an `EuiModal` (by
 * {@link ApprovalModal}) or directly into a div/card (by the Agent Builder
 * proposal attachment) without adding an extra wrapping element.
 *
 * Declining is built in, driven entirely by `onDismiss`: this owns its own "view"/"declining"
 * mode, swapping the comment for `DeclineReasonForm` and the footer for Cancel/Decline, so both
 * hosts get the identical inline decline UX rather than each tracking its own mode and rendering
 * the form itself.
 *
 * The decision's async lifecycle is the host's, not this component's: `isSubmitting` and the
 * proposal's own decision together are the whole phase this renders — the badge, the header's
 * actor/time caption, and the outcome banner. This only wraps `onApprove` to surface a rejection
 * as its own banner; it holds no phase of its own, so it renders identically whether it just
 * mounted or has been open the whole time.
 *
 * Footer is omitted entirely once the proposal is decided or in a transient state — see
 * `isSettledOrTransient` below.
 */
export const ApprovalContent = memo<ApprovalContentProps>(
  ({
    proposal,
    titleId,
    isSubmitting,
    submittedAt,
    currentActorName,
    alwaysAllow,
    readOnly,
    onApprove,
    secondaryActions,
    onDismiss,
    onReopen,
    isReopening = false,
    'data-test-subj': dataTestSubj,
  }) => {
    const generatedTitleId = useGeneratedHtmlId({ prefix: 'ApprovalContent' });
    const [actionError, setActionError] = useState<string | undefined>(undefined);
    const [mode, setMode] = useState<'view' | 'declining'>('view');
    const [dismissReason, setDismissReason] = useState<DismissReason>('no_reason');
    const [rationale, setRationale] = useState('');
    // When a decision started, for the in-progress banners' "Name on {time}", as the host knows it
    // (`submittedAt`) or, failing that, from watching it start here. A modal that opens after the
    // submission began cannot know the true start, so it shows no time rather than a wrong one.
    const [watchedStart, setWatchedStart] = useState<string | undefined>(undefined);
    const previousSubmitting = useRef(isSubmitting);
    useEffect(() => {
      // Only a start seen here counts; mounting while already submitting is not one.
      if (isSubmitting && !previousSubmitting.current) {
        setWatchedStart(new Date().toISOString());
      } else if (!isSubmitting) {
        setWatchedStart(undefined);
      }
      previousSubmitting.current = isSubmitting;
    }, [isSubmitting]);
    const since = submittedAt ?? watchedStart;
    const isExpired = isProposalExpired(proposal);
    const isReplaced = isProposalReplaced(proposal);
    const displayMode = isReplaced ? 'view' : mode;
    const decision = getProposalDecision(proposal);
    const tone = getProposalTone(proposal);
    // A to-do is the analyst's to carry out, so there is nothing to approve: confirming they did
    // it takes the place of Approve. They can still decline it.
    const isTodo = isTodoProposal(proposal);

    const primaryAction: ApprovalAction | undefined = onApprove
      ? {
          label: isTodo
            ? APPROVAL_MODAL_TRANSLATIONS.markApplied
            : APPROVAL_MODAL_TRANSLATIONS.approve,
          ...(isTodo && { iconType: 'check' as const }),
          onClick: onApprove,
          color: 'primary',
          isDisabled: isReplaced || isExpired || readOnly,
          'data-test-subj': dataTestSubj ? `${dataTestSubj}-confirm` : undefined,
        }
      : undefined;

    const startDeclining = useCallback(() => {
      setActionError(undefined);
      setMode('declining');
    }, []);

    const cancelDeclining = useCallback(() => {
      setMode('view');
      setDismissReason('no_reason');
      setRationale('');
      setActionError(undefined);
    }, []);

    const declineConfirmAction = useCallback(async () => {
      if (!onDismiss) {
        return;
      }
      await onDismiss({ dismissReason, rationale: rationale.trim() || undefined });
      setMode('view');
      setDismissReason('no_reason');
      setRationale('');
    }, [onDismiss, dismissReason, rationale]);

    // `no_reason` — the default — already counts as an explicit selection; only `other` needs
    // the free-text field, since it is the sole detail that reason carries.
    const isDeclineDisabled = dismissReason === 'other' && rationale.trim() === '';

    const resolvedPrimaryAction: ApprovalAction | undefined =
      displayMode === 'declining'
        ? {
            label: APPROVAL_MODAL_TRANSLATIONS.dismiss,
            color: 'danger',
            fill: false,
            iconType: 'cross',
            onClick: declineConfirmAction,
            isDisabled: isDeclineDisabled || primaryAction?.isDisabled,
            'data-test-subj': dataTestSubj ? `${dataTestSubj}-confirm-decline` : undefined,
          }
        : primaryAction;

    const resolvedSecondaryActions: ApprovalAction[] | undefined =
      displayMode === 'declining'
        ? [
            {
              label: APPROVAL_MODAL_TRANSLATIONS.cancelDecline,
              color: 'text',
              onClick: cancelDeclining,
              'data-test-subj': dataTestSubj ? `${dataTestSubj}-cancel-decline` : undefined,
            },
          ]
        : [
            ...(secondaryActions ?? []),
            ...(onDismiss
              ? [
                  {
                    label: APPROVAL_MODAL_TRANSLATIONS.dismiss,
                    color: 'text' as const,
                    iconType: 'cross' as const,
                    onClick: startDeclining,
                    isDisabled: isReplaced || primaryAction?.isDisabled,
                    'data-test-subj': dataTestSubj ? `${dataTestSubj}-dismiss` : undefined,
                  },
                ]
              : []),
          ];

    const handlePrimaryClick = useCallback(async (action: ApprovalAction) => {
      setActionError(undefined);
      try {
        await action.onClick();
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : APPROVAL_MODAL_TRANSLATIONS.actionErrorTitle
        );
      }
    }, []);

    const approvalPhase = getProposalPhase(proposal, isSubmitting);

    // A replaced proposal shows no outcome banner and no footer, since its successor carries the
    // live state, but a failed attempt still has to say how it ended.
    const isReplacedFailure = isReplaced && decision?.status === 'failed';
    // An undecided proposal this user has no permission to decide: the same restricted state the
    // flyout row shows, so the row and its modal agree.
    const isRestricted = !!readOnly && !isReplaced && approvalPhase === 'pending' && !isExpired;
    // Shared with the flyout row, so the badge outside and the badge inside always agree.
    const badge = getProposalBadge(proposal, { readOnly, isSubmitting });
    const banner = isReplaced ? undefined : getApprovalOutcomeBanner(approvalPhase);
    // A decision in flight has no reason to give yet, only what it is waiting on.
    const startedBy = currentActorName ?? APPROVAL_MODAL_TRANSLATIONS.currentActorFallback;
    const startedAt = since ? formatDateTime(since) : undefined;
    // A decision still in flight keeps the state's own title (Applying, Declining), then
    // who asked and when as the description.
    const applyingSince = decision?.decidedAt ?? since;
    const inFlightDescription =
      approvalPhase === 'declining'
        ? APPROVAL_MODAL_TRANSLATIONS.whoAndWhenBannerDescription(startedBy, startedAt)
        : approvalPhase === 'applying'
        ? // The click still in flight (the current user's) or the approval running (the saved
          // decision's).
          APPROVAL_MODAL_TRANSLATIONS.whoAndWhenBannerDescription(
            decision?.actorName ?? startedBy,
            applyingSince ? formatDateTime(applyingSince) : undefined
          )
        : undefined;
    // A settled decision: who decided it and when, then the reason if there is one.
    const settledDescription =
      approvalPhase === 'applied' ||
      approvalPhase === 'marked_applied' ||
      approvalPhase === 'no_action' ||
      approvalPhase === 'declined' ||
      approvalPhase === 'failed'
        ? [
            APPROVAL_MODAL_TRANSLATIONS.whoAndWhenBannerDescription(
              decision?.actorName ?? APPROVAL_MODAL_TRANSLATIONS.unknownActorFallback,
              decision?.decidedAt ? formatDateTime(decision.decidedAt) : undefined
            ),
            typeof decision?.reason === 'string' ? decision.reason : undefined,
          ]
            .filter(Boolean)
            // Two plain sentences: who and when, a full stop, then the reason.
            .join('. ')
        : undefined;
    // Every phase with a banner is one of the two above; the others have no banner to describe.
    const bannerReason = inFlightDescription ?? settledDescription;
    const isSettledOrTransient = approvalPhase !== 'pending';

    // Only a human's own "Mark as applied" can be taken back: nothing ran, so nothing is undone.
    const canReopen =
      Boolean(onReopen) && isTodo && !isReplaced && approvalPhase === 'marked_applied';
    const reopenAction: ApprovalAction | undefined =
      canReopen && onReopen
        ? {
            label: APPROVAL_MODAL_TRANSLATIONS.markNotApplied,
            color: 'text',
            iconType: 'undo',
            isDisabled: readOnly,
            isLoading: isReopening,
            onClick: async () => {
              setActionError(undefined);
              try {
                await onReopen();
              } catch (err) {
                setActionError(
                  err instanceof Error ? err.message : APPROVAL_MODAL_TRANSLATIONS.actionErrorTitle
                );
              }
            },
            'data-test-subj': dataTestSubj ? `${dataTestSubj}-reopen` : undefined,
          }
        : undefined;

    // The header always names the action itself — type, reversibility and impact, whichever of
    // them the proposal has — in every state. The banner says what is happening or happened, and
    // by whom.
    const headerCaption = getProposalCaption(proposal, { includeRiskDetails: true }) && (
      <ProposalCaption proposal={proposal} includeRiskDetails />
    );

    const defaultButtonColor: EuiButtonColor = tone === 'danger' ? 'danger' : 'primary';

    const hasFooter =
      resolvedPrimaryAction !== undefined ||
      (resolvedSecondaryActions !== undefined && resolvedSecondaryActions.length > 0);

    // Hidden once the decline is actually submitting: the banner above already reads
    // "Declining", and the footer with Cancel/Decline is gone too (via `isSettledOrTransient`) —
    // showing the form alongside a banner that says the decision is already in flight would be
    // confusing.
    const showDeclineForm =
      displayMode === 'declining' && isSubmitting !== 'declining' && !isRestricted;

    return (
      <>
        <ApprovalContentHeader
          badge={badge}
          caption={headerCaption}
          title={proposal.title}
          titleId={titleId ?? generatedTitleId}
        />

        <ApprovalContentBody
          // A user who loses the permission mid-decline has no Cancel to come back with, so the body
          // returns to its view mode and shows the proposal again.
          mode={isRestricted ? 'view' : displayMode}
          comment={proposal.comment}
          banner={banner}
          bannerReason={bannerReason}
          actionError={actionError}
          data-test-subj={dataTestSubj}
        />

        {displayMode === 'view' && alwaysAllow && (
          <AlwaysAllowCheckbox
            option={alwaysAllow}
            data-test-subj={dataTestSubj ? `${dataTestSubj}-always-allow` : undefined}
          />
        )}

        {/* A replaced card's only callout is why its own attempt failed; the rest belong to the
            live successor. Hidden while declining: the reason form takes its place. */}
        {!showDeclineForm && (
          <ApprovalStatusCallouts
            isPending={!isReplaced && !isRestricted && approvalPhase === 'pending'}
            previousExecutionError={proposal.previousExecutionError}
            failedAttemptError={
              isReplacedFailure ? settledDescription ?? proposal.executionError : undefined
            }
            isExpired={isExpired}
            expiredCaption={isExpired ? getExpiredCaption(proposal) : undefined}
            expiresAt={proposal.expiresAt}
            upcomingExpiry={
              !isReplaced && approvalPhase === 'pending' ? proposal.expiresAt : undefined
            }
            isRestricted={isRestricted}
            isReplaced={isReplaced}
            data-test-subj={dataTestSubj}
          />
        )}

        {showDeclineForm && (
          <DeclineReasonForm
            dismissReason={dismissReason}
            rationale={rationale}
            onDismissReasonChange={setDismissReason}
            onRationaleChange={setRationale}
            data-test-subj={dataTestSubj ? `${dataTestSubj}-decline-form` : undefined}
          />
        )}

        {/* A restricted user has nothing to submit (the callout above says why), and neither does a
            replaced proposal: its successor is the one to decide. */}
        {/* Decided/transient states name their actor in the header caption already — no need
            to repeat it here, so there is nothing left in the footer to show. */}
        {!isSettledOrTransient && hasFooter && !isRestricted && !isReplaced && (
          <ApprovalContentFooter
            secondaryActions={resolvedSecondaryActions}
            primaryAction={resolvedPrimaryAction}
            defaultButtonColor={defaultButtonColor}
            onPrimaryClick={handlePrimaryClick}
          />
        )}

        {reopenAction && (
          <ApprovalContentFooter
            secondaryActions={[reopenAction]}
            defaultButtonColor={defaultButtonColor}
            onPrimaryClick={handlePrimaryClick}
          />
        )}
      </>
    );
  }
);

ApprovalContent.displayName = 'ApprovalContent';
