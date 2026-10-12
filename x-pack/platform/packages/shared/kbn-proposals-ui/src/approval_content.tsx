/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import { type EuiButtonColor, useGeneratedHtmlId } from '@elastic/eui';
import type { DismissReason } from '@kbn/proposals-common';
import { ApprovalContentHeader } from './approval_content_header';
import { ApprovalActorTime } from './approval_actor_time';
import { AlwaysAllowCheckbox } from './always_allow_checkbox';
import { DeclineReasonForm } from './decline_reason_form';
import { ApprovalContentBody } from './approval_content_body';
import { ApprovalStatusCallouts } from './approval_status_callouts';
import { ApprovalContentFooter } from './approval_content_footer';
import {
  getApprovalOutcomeBadge,
  getApprovalOutcomeBanner,
  type ApprovalPhase,
} from './approval_outcome';
import { APPROVAL_MODAL_TRANSLATIONS } from './translations';
import {
  getProposalCaption,
  getProposalDecision,
  getProposalTone,
  isProposalExpired,
} from './proposal_helpers';
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
  /**
   * Who is submitting right now, for the "Applying"/"Declining" phase's live caption. Falls back
   * to a generic "You" when omitted, so a host that has not wired a profile lookup still gets a
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
   * Approves the proposal. Rendered as a filled `EuiButton` labeled "Approve", disabled once the
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
   * modal or an Agent Builder chat card. Disabled whenever the Approve button is.
   */
  onDismiss?: (params: DeclineParams) => Promise<void>;
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
    currentActorName,
    alwaysAllow,
    readOnly,
    onApprove,
    secondaryActions,
    onDismiss,
    'data-test-subj': dataTestSubj,
  }) => {
    const generatedTitleId = useGeneratedHtmlId({ prefix: 'ApprovalContent' });
    const [actionError, setActionError] = useState<string | undefined>(undefined);
    const [mode, setMode] = useState<'view' | 'declining'>('view');
    const [dismissReason, setDismissReason] = useState<DismissReason>('no_reason');
    const [rationale, setRationale] = useState('');
    // Only for the live "Xs ago" caption below — not for the phase itself, which reads `isSubmitting`
    // directly. Resets whenever this component (re)mounts while already submitting, so a modal
    // reopened mid-submission restarts the counter rather than reading the true elapsed time; the
    // phase it is captioning is still correct either way.
    const [since, setSince] = useState<string | undefined>(undefined);

    useEffect(() => {
      setSince(isSubmitting ? new Date().toISOString() : undefined);
    }, [isSubmitting]);

    const actorName = currentActorName ?? APPROVAL_MODAL_TRANSLATIONS.currentActorFallback;
    const isExpired = isProposalExpired(proposal);
    const isReplaced = proposal.supersededBy !== undefined || proposal.status === 'superseded';
    const displayMode = isReplaced ? 'view' : mode;
    const decision = isReplaced ? undefined : getProposalDecision(proposal);
    const tone = getProposalTone(proposal);

    const primaryAction: ApprovalAction | undefined = onApprove
      ? {
          label: APPROVAL_MODAL_TRANSLATIONS.approve,
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

    const approvalPhase: ApprovalPhase = isReplaced
      ? 'pending'
      : decision
      ? decision.status
      : isSubmitting ?? 'pending';

    const badge = getApprovalOutcomeBadge(approvalPhase);
    const banner = isReplaced ? undefined : getApprovalOutcomeBanner(approvalPhase);
    const bannerSuffix = decision?.reason ?? banner?.hint;
    const isSettledOrTransient = approvalPhase !== 'pending';

    const headerCaption = decision?.actorName ? (
      <ApprovalActorTime actorName={decision.actorName} at={decision.decidedAt} />
    ) : !isReplaced && isSubmitting && since ? (
      <ApprovalActorTime actorName={actorName} at={since} live />
    ) : (
      getProposalCaption(proposal, { includeRiskDetails: !isReplaced })
    );

    const defaultButtonColor: EuiButtonColor = tone === 'danger' ? 'danger' : 'primary';

    const hasFooter =
      resolvedPrimaryAction !== undefined ||
      (resolvedSecondaryActions !== undefined && resolvedSecondaryActions.length > 0);

    // Hidden once the decline is actually submitting: the banner above already reads
    // "Declining", and the footer with Cancel/Decline is gone too (via `isSettledOrTransient`) —
    // showing the form alongside a banner that says the decision is already in flight would be
    // confusing.
    const showDeclineForm = displayMode === 'declining' && isSubmitting !== 'declining';

    return (
      <>
        <ApprovalContentHeader
          badge={badge}
          showStatusBadge={!isReplaced}
          caption={headerCaption}
          title={proposal.title}
          titleId={titleId ?? generatedTitleId}
        />

        <ApprovalContentBody
          mode={displayMode}
          comment={proposal.comment}
          banner={banner}
          bannerSuffix={bannerSuffix}
          actionError={actionError}
          data-test-subj={dataTestSubj}
        />

        {displayMode === 'view' && alwaysAllow && (
          <AlwaysAllowCheckbox
            option={alwaysAllow}
            data-test-subj={dataTestSubj ? `${dataTestSubj}-always-allow` : undefined}
          />
        )}

        {!isReplaced && (
          <ApprovalStatusCallouts
            isPending={approvalPhase === 'pending'}
            previousExecutionError={proposal.previousExecutionError}
            isExpired={isExpired}
            expiredReason={proposal.rationale}
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

        {/* Decided/transient states name their actor in the header caption already — no need
            to repeat it here, so there is nothing left in the footer to show. */}
        {!isSettledOrTransient && hasFooter && (
          <ApprovalContentFooter
            secondaryActions={resolvedSecondaryActions}
            primaryAction={resolvedPrimaryAction}
            defaultButtonColor={defaultButtonColor}
            onPrimaryClick={handlePrimaryClick}
          />
        )}
      </>
    );
  }
);

ApprovalContent.displayName = 'ApprovalContent';
