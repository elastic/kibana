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
import type { ApprovalAction, AlwaysAllowOption, DeclineParams } from './types';

/**
 * A proposal already decided, read from the real record rather than assumed from a click.
 * `status` admits `'applying'`/`'failed'` alongside `'applied'`/`'declined'`: approving only
 * resumes the gate workflow, whose post-gate steps run the action, so a decided proposal can
 * still read `executing` or `failed` once that real record is what supplies this.
 */
export interface ApprovalDecision {
  status: Exclude<ApprovalPhase, 'pending'>;
  /**
   * Omitted when nobody actually decided — an expired gate timed out rather than being approved or
   * declined by anyone. Callers fall back to their own plain caption rather than rendering a
   * fabricated "by Unknown" for an outcome no one chose.
   */
  actorName?: string;
  /** ISO 8601 timestamp. Optional: the record itself may carry none — see `ApprovalActorTime`. */
  decidedAt?: string;
  /** Shown in the outcome banner, e.g. why a decline was made. */
  reason?: React.ReactNode;
}

export interface ApprovalContentProps {
  title: string;
  tone: 'primary' | 'danger';
  /** The proposal's own markdown, rendered as the body. */
  comment?: string;
  titleId?: string;
  /** Header caption below the badge, e.g. a category/reversibility line. Omitted when there is none. */
  caption?: React.ReactNode;
  /** Already decided — read-only history. Omit while a proposal is still awaiting one. */
  decision?: ApprovalDecision;
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
  /** Rendered as a filled `EuiButton`. Footer is omitted entirely when both this and `secondaryActions` are absent. */
  primaryAction?: ApprovalAction;
  /** Each entry rendered as an `EuiButtonEmpty`. */
  secondaryActions?: ApprovalAction[];
  /**
   * Enables the built-in decline flow. When set, a "Decline" trigger appears next to
   * `primaryAction`; clicking it swaps the body for `DeclineReasonForm` and the footer for
   * Cancel/Decline, entirely within this component — so a host never renders `DeclineReasonForm`
   * itself or tracks its own declining mode. The same flow renders identically whether this is
   * placed inside a modal or an Agent Builder chat card. Disabled whenever `primaryAction` is.
   */
  onDismiss?: (params: DeclineParams) => Promise<void>;
  /**
   * Error from a prior run of this proposal's action, shown as a warning explaining why the
   * proposal is being offered again. Only rendered while still pending — a decided proposal's
   * outcome banner already covers it.
   */
  previousExecutionError?: string;
  /**
   * Whether the decision deadline has passed. `ApprovalContent`'s own badge already says
   * "Expired"; this adds the explanation the badge alone has no room for. Passed explicitly
   * rather than derived from `decision` here, since a caller may compute it against a proposal
   * shape this component never sees.
   */
  isExpired?: boolean;
  'data-test-subj'?: string;
}

/**
 * Layout-agnostic approval UI.
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
 * The decision's async lifecycle is the host's, not this component's: `isSubmitting` and
 * `decision` together are the whole phase this renders — the badge, the header's actor/time
 * caption, and the outcome banner. This only wraps `primaryAction.onClick` to surface a
 * rejection as its own banner; it holds no phase of its own, so it renders identically whether
 * it just mounted or has been open the whole time.
 *
 * Footer is omitted entirely when neither `primaryAction` nor `secondaryActions` are provided.
 */
export const ApprovalContent = memo<ApprovalContentProps>(
  ({
    title,
    tone,
    comment,
    titleId,
    caption,
    decision,
    isSubmitting,
    currentActorName,
    alwaysAllow,
    primaryAction,
    secondaryActions,
    onDismiss,
    previousExecutionError,
    isExpired,
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
      mode === 'declining'
        ? {
            label: APPROVAL_MODAL_TRANSLATIONS.dismiss,
            color: 'danger',
            iconType: 'cross',
            onClick: declineConfirmAction,
            isDisabled: isDeclineDisabled,
            'data-test-subj': dataTestSubj ? `${dataTestSubj}-confirm-decline` : undefined,
          }
        : primaryAction;

    const resolvedSecondaryActions: ApprovalAction[] | undefined =
      mode === 'declining'
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
                    isDisabled: primaryAction?.isDisabled,
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

    const approvalPhase: ApprovalPhase = decision ? decision.status : isSubmitting ?? 'pending';

    const badge = getApprovalOutcomeBadge(approvalPhase);
    const banner = getApprovalOutcomeBanner(approvalPhase);
    const bannerSuffix = decision?.reason ?? banner?.hint;
    const isSettledOrTransient = approvalPhase !== 'pending';

    const headerCaption = decision?.actorName ? (
      <ApprovalActorTime actorName={decision.actorName} at={decision.decidedAt} />
    ) : isSubmitting && since ? (
      <ApprovalActorTime actorName={actorName} at={since} live />
    ) : (
      caption
    );

    const defaultButtonColor: EuiButtonColor = tone === 'danger' ? 'danger' : 'primary';

    const hasFooter =
      resolvedPrimaryAction !== undefined ||
      (resolvedSecondaryActions !== undefined && resolvedSecondaryActions.length > 0);

    // Hidden once the decline is actually submitting: the banner above already reads
    // "Declining", and the footer with Cancel/Decline is gone too (via `isSettledOrTransient`) —
    // showing the form alongside a banner that says the decision is already in flight would be
    // confusing.
    const showDeclineForm = mode === 'declining' && isSubmitting !== 'declining';

    return (
      <>
        <ApprovalContentHeader
          badge={badge}
          caption={headerCaption}
          title={title}
          titleId={titleId ?? generatedTitleId}
        />

        <ApprovalContentBody
          mode={mode}
          comment={comment}
          banner={banner}
          bannerSuffix={bannerSuffix}
          actionError={actionError}
          data-test-subj={dataTestSubj}
        />

        {mode === 'view' && alwaysAllow && (
          <AlwaysAllowCheckbox
            option={alwaysAllow}
            data-test-subj={dataTestSubj ? `${dataTestSubj}-always-allow` : undefined}
          />
        )}

        <ApprovalStatusCallouts
          isPending={approvalPhase === 'pending'}
          previousExecutionError={previousExecutionError}
          isExpired={isExpired}
          data-test-subj={dataTestSubj}
        />

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
