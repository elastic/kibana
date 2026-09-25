/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiLoadingSpinner,
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
  type ApprovalPhase,
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
  'data-test-subj'?: string;
}

/**
 * A proposal already decided, read from the real record rather than assumed from a click.
 * `status` admits `'applying'`/`'failed'` alongside `'applied'`/`'declined'`: approving only
 * resumes the gate workflow, whose post-gate steps run the action, so a decided proposal can
 * still read `executing` or `failed` once that real record is what supplies this.
 */
export interface ApprovalDecision {
  status: Exclude<ApprovalPhase, 'pending'>;
  actorName: string;
  /** ISO 8601 timestamp. Optional: the record itself may carry none — see `ApprovalActorTime`. */
  decidedAt?: string;
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
  /** Extra content inserted between the body and the footer — use for inline forms (e.g. dismiss reason). */
  children?: React.ReactNode;
  'data-test-subj'?: string;
}

const bannerIconFor = (color: 'success' | 'primary' | 'danger'): IconType =>
  color === 'success' ? 'check' : color === 'danger' ? 'warning' : 'clock';

/**
 * Layout-agnostic approval UI.
 *
 * Renders as a React Fragment so it can be placed inside an `EuiModal` (by
 * {@link ApprovalModal}) or directly into a div/card (by the Agent Builder
 * proposal attachment) without adding an extra wrapping element.
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
    iconType,
    comment,
    showHeader = true,
    titleId,
    caption,
    decision,
    isSubmitting,
    currentActorName,
    alwaysAllow,
    primaryAction,
    secondaryActions,
    children,
    'data-test-subj': dataTestSubj,
  }) => {
    const { euiTheme } = useEuiTheme();
    const [actionError, setActionError] = useState<string | undefined>(undefined);
    // Only for the live "Xs ago" caption below — not for the phase itself, which reads `isSubmitting`
    // directly. Resets whenever this component (re)mounts while already submitting, so a modal
    // reopened mid-submission restarts the counter rather than reading the true elapsed time; the
    // phase it is captioning is still correct either way.
    const [since, setSince] = useState<string | undefined>(undefined);

    useEffect(() => {
      setSince(isSubmitting ? new Date().toISOString() : undefined);
    }, [isSubmitting]);

    const actorName = currentActorName ?? APPROVAL_MODAL_TRANSLATIONS.currentActorFallback;

    const handlePrimaryClick = useCallback(async () => {
      if (!primaryAction) {
        return;
      }
      setActionError(undefined);
      try {
        await primaryAction.onClick();
      } catch (err) {
        setActionError(
          err instanceof Error ? err.message : APPROVAL_MODAL_TRANSLATIONS.actionErrorTitle
        );
      }
    }, [primaryAction]);

    const approvalPhase: ApprovalPhase = decision ? decision.status : isSubmitting ?? 'pending';

    const badge = getApprovalOutcomeBadge(approvalPhase);
    const banner = getApprovalOutcomeBanner(approvalPhase);
    const bannerSuffix = decision?.reason ?? banner?.hint;
    const isSettledOrTransient = approvalPhase !== 'pending';

    const headerCaption = decision ? (
      <ApprovalActorTime actorName={decision.actorName} at={decision.decidedAt} />
    ) : isSubmitting && since ? (
      <ApprovalActorTime actorName={actorName} at={since} live />
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
              iconType={banner.isLoading ? EuiLoadingSpinner : bannerIconFor(banner.color)}
              title={
                // The reason/hint suffix reads as detail, not part of the state word itself — the
                // callout's own title styling would otherwise bold all of it.
                bannerSuffix ? (
                  <>
                    {banner.title}
                    <span css={css({ fontWeight: euiTheme.font.weight.regular })}>
                      {' • '}
                      {bannerSuffix}
                    </span>
                  </>
                ) : (
                  banner.title
                )
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
