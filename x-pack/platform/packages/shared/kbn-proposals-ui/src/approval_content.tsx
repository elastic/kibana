/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiMarkdownFormat,
  useEuiTheme,
  type EuiButtonColor,
} from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { ApprovalModalHeader } from './approval_modal_header';
import { ApprovalActorTime } from './approval_actor_time';
import { AlwaysAllowCheckbox } from './always_allow_checkbox';
import {
  getApprovalOutcomeBadge,
  getApprovalOutcomeBanner,
  type ApprovalOutcomeStatus,
} from './approval_outcome';
import { APPROVAL_MODAL_TRANSLATIONS } from './translations';

export interface AlwaysAllowOption {
  id: string;
  label: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export interface ApprovalAction {
  label: string;
  onClick: () => void | Promise<void>;
  /** Overrides the component-level {@link ApprovalContentProps.iconType} on the button. */
  iconType?: IconType;
  color?: EuiButtonColor;
  isDisabled?: boolean;
  isLoading?: boolean;
  /**
   * Read only off `primaryAction`. Once its `onClick` promise resolves, this is the decision it
   * made — drives the transient "Applying"/"Declining" phase and the badge/banner/footer once it
   * settles, so a caller stops having to track loading state and render the outcome itself.
   */
  outcomeStatus?: ApprovalOutcomeStatus;
  'data-test-subj'?: string;
}

/** A proposal already decided — by this component's own click, or before this render existed. */
export interface ApprovalDecision {
  status: ApprovalOutcomeStatus;
  actorName: string;
  /** ISO 8601 timestamp. */
  decidedAt: string;
  /** Shown in the outcome banner, e.g. why a decline was made. */
  reason?: React.ReactNode;
}

export interface ApprovalContentProps {
  title: string;
  tone: 'primary' | 'danger';
  /** Fallback icon for the primary-action button. */
  iconType: IconType;
  /** The proposal's own markdown, rendered as the body. */
  comment?: string;
  /**
   * Show the badge + title header.
   * Set to `false` when a host (e.g. Agent Builder attachment framework) already draws its own header.
   * @default true
   */
  showHeader?: boolean;
  titleId?: string;
  /** Header caption below the badge, e.g. a category/reversibility line. Omitted when there is none. */
  caption?: React.ReactNode;
  /** Already decided — read-only history. Omit while a proposal is still awaiting one. */
  decision?: ApprovalDecision;
  /**
   * Who is submitting `primaryAction` right now, for the optimistic "Applying"/"Declining" phase.
   * Falls back to a generic "You" when omitted, so a host that has not wired a profile lookup
   * still gets a coherent transient state.
   */
  currentActorName?: string;
  alwaysAllow?: AlwaysAllowOption;
  /** Rendered as a filled `EuiButton`. Footer is omitted entirely when both this and `secondaryActions` are absent. */
  primaryAction?: ApprovalAction;
  /** Each entry rendered as an `EuiButtonEmpty`. */
  secondaryActions?: ApprovalAction[];
  /** Extra content inserted between the body and the footer — use for inline forms (e.g. dismiss reason). */
  children?: React.ReactNode;
  'data-test-subj'?: string;
}

type TransientPhase = 'idle' | 'applying' | 'declining';

const bannerIconFor = (color: 'success' | 'primary' | 'danger'): IconType =>
  color === 'success' ? 'check' : color === 'danger' ? 'warning' : 'clock';

/**
 * Layout-agnostic approval UI.
 *
 * Renders as a React Fragment so it can be placed inside an `EuiModal` (by
 * {@link ApprovalModal}) or directly into a div/card (by the Agent Builder
 * proposal attachment) without adding an extra wrapping element.
 *
 * Owns the decision's async lifecycle: `primaryAction.onClick` may return a promise, and while it
 * is in flight (and once it settles) this renders the transient/outcome UI itself — the badge,
 * the header's actor/time caption, and the outcome banner — rather than a caller tracking
 * `isLoading` and re-deriving the same thing. A caller only needs to supply the mutation and, once
 * the server confirms it, a real `decision` prop; until then the optimistic one this produces
 * carries the UI.
 *
 * Footer is omitted entirely when neither `primaryAction` nor `secondaryActions` are provided.
 */
export const ApprovalContent = memo<ApprovalContentProps>(
  ({
    title,
    tone,
    iconType,
    comment,
    showHeader = true,
    titleId,
    caption,
    decision,
    currentActorName,
    alwaysAllow,
    primaryAction,
    secondaryActions,
    children,
    'data-test-subj': dataTestSubj,
  }) => {
    const { euiTheme } = useEuiTheme();
    const [transientPhase, setTransientPhase] = useState<TransientPhase>('idle');
    const [transientSince, setTransientSince] = useState<string | undefined>(undefined);
    const [optimisticDecision, setOptimisticDecision] = useState<ApprovalDecision | undefined>(
      undefined
    );
    const [actionError, setActionError] = useState<string | undefined>(undefined);

    const effectiveDecision = decision ?? optimisticDecision;
    const actorName = currentActorName ?? APPROVAL_MODAL_TRANSLATIONS.currentActorFallback;

    const handlePrimaryClick = useCallback(async () => {
      if (!primaryAction) {
        return;
      }
      setActionError(undefined);
      if (!primaryAction.outcomeStatus) {
        // No decision to track (e.g. a step that just moves to a different form) — run it as-is.
        await primaryAction.onClick();
        return;
      }
      const startedAt = new Date().toISOString();
      setTransientSince(startedAt);
      setTransientPhase(primaryAction.outcomeStatus === 'declined' ? 'declining' : 'applying');
      try {
        await primaryAction.onClick();
        setOptimisticDecision({
          status: primaryAction.outcomeStatus,
          actorName,
          decidedAt: startedAt,
        });
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : APPROVAL_MODAL_TRANSLATIONS.actionErrorTitle
        );
      } finally {
        setTransientPhase('idle');
      }
    }, [primaryAction, actorName]);

    const approvalPhase = effectiveDecision
      ? effectiveDecision.status
      : transientPhase === 'idle'
      ? 'pending'
      : transientPhase;

    const badge = getApprovalOutcomeBadge(approvalPhase);
    const banner = getApprovalOutcomeBanner(approvalPhase);
    const isSettledOrTransient = approvalPhase !== 'pending';

    const headerCaption = effectiveDecision ? (
      <ApprovalActorTime actorName={effectiveDecision.actorName} at={effectiveDecision.decidedAt} />
    ) : transientPhase !== 'idle' && transientSince ? (
      <ApprovalActorTime actorName={actorName} at={transientSince} live />
    ) : (
      caption
    );

    const defaultButtonColor: EuiButtonColor = tone === 'danger' ? 'danger' : 'primary';

    const hasFooter =
      primaryAction !== undefined ||
      (secondaryActions !== undefined && secondaryActions.length > 0);

    return (
      <>
        {showHeader && (
          <ApprovalModalHeader
            badge={badge}
            caption={headerCaption}
            title={title}
            titleId={titleId ?? ''}
          />
        )}

        <div
          css={css({
            padding: `0 ${euiTheme.size.base} ${euiTheme.size.base} ${euiTheme.size.base}`,
            maxBlockSize: '50vh',
            overflowY: 'auto',
          })}
        >
          {/* A comment is as long as the worker made it, so the body scrolls and the footer stays
            reachable without the modal growing past the viewport. */}
          {comment !== undefined && (
            <div css={css({ marginBottom: euiTheme.size.m })}>
              <EuiMarkdownFormat
                textSize="s"
                data-test-subj={dataTestSubj ? `${dataTestSubj}-comment` : undefined}
              >
                {comment}
              </EuiMarkdownFormat>
            </div>
          )}

          {banner && (
            // eslint-disable-next-line @kbn/kbn-ui/prefer_kbn_ui_callout
            <EuiCallOut
              announceOnMount
              size="s"
              color={banner.color}
              iconType={bannerIconFor(banner.color)}
              title={
                effectiveDecision?.reason
                  ? `${banner.title} • ${effectiveDecision.reason}`
                  : banner.hint
                  ? `${banner.title} • ${banner.hint}`
                  : banner.title
              }
              data-test-subj={dataTestSubj ? `${dataTestSubj}-outcome` : undefined}
            />
          )}

          {actionError && (
            <>
              <div css={css({ marginTop: euiTheme.size.s })} />
              {/* eslint-disable-next-line @kbn/kbn-ui/prefer_kbn_ui_callout */}
              <EuiCallOut
                announceOnMount
                size="s"
                color="danger"
                title={actionError}
                data-test-subj={dataTestSubj ? `${dataTestSubj}-error` : undefined}
              />
            </>
          )}
        </div>

        {alwaysAllow && (
          <AlwaysAllowCheckbox
            option={alwaysAllow}
            data-test-subj={dataTestSubj ? `${dataTestSubj}-always-allow` : undefined}
          />
        )}

        {children}

        {/* Decided/transient states name their actor in the header caption already — no need
            to repeat it here, so there is nothing left in the footer to show. */}
        {!isSettledOrTransient && hasFooter && (
          <div
            css={css({
              display: 'flex',
              gap: euiTheme.size.s,
              justifyContent: 'flex-end',
              padding: `0 ${euiTheme.size.base} ${euiTheme.size.base}`,
            })}
          >
            {/* Secondaries first so the decision that commits something sits rightmost. */}
            {secondaryActions?.map((action, i) => (
              <EuiButtonEmpty
                key={i}
                size="s"
                color={action.color ?? 'primary'}
                iconType={action.iconType}
                isDisabled={action.isDisabled}
                isLoading={action.isLoading}
                onClick={action.onClick}
                data-test-subj={action['data-test-subj']}
              >
                {action.label}
              </EuiButtonEmpty>
            ))}
            {primaryAction && (
              <EuiButton
                fill
                size="s"
                color={primaryAction.color ?? defaultButtonColor}
                iconType={primaryAction.iconType ?? iconType}
                isDisabled={primaryAction.isDisabled}
                isLoading={primaryAction.isLoading}
                onClick={handlePrimaryClick}
                data-test-subj={primaryAction['data-test-subj']}
              >
                {primaryAction.label}
              </EuiButton>
            )}
          </div>
        )}
      </>
    );
  }
);

ApprovalContent.displayName = 'ApprovalContent';
