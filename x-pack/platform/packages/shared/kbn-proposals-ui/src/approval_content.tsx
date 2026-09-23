/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiMarkdownFormat,
  useEuiTheme,
  type EuiButtonColor,
} from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { ApprovalModalHeader } from './approval_modal_header';
import { AlwaysAllowCheckbox } from './always_allow_checkbox';

export interface AlwaysAllowOption {
  id: string;
  label: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export interface ApprovalAction {
  label: string;
  onClick: () => void;
  /** Overrides the component-level {@link ApprovalContentProps.iconType} on the button. */
  iconType?: IconType;
  color?: EuiButtonColor;
  isDisabled?: boolean;
  isLoading?: boolean;
  'data-test-subj'?: string;
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
  alwaysAllow?: AlwaysAllowOption;
  /** Rendered as a filled `EuiButton`. Footer is omitted entirely when both this and `secondaryActions` are absent. */
  primaryAction?: ApprovalAction;
  /** Each entry rendered as an `EuiButtonEmpty`. */
  secondaryActions?: ApprovalAction[];
  /** Extra content inserted between the body and the footer — use for inline forms (e.g. dismiss reason). */
  children?: React.ReactNode;
  'data-test-subj'?: string;
}

/**
 * Layout-agnostic approval UI.
 *
 * Renders as a React Fragment so it can be placed inside an `EuiModal` (by
 * {@link ApprovalModal}) or directly into a div/card (by the Agent Builder
 * proposal attachment) without adding an extra wrapping element.
 *
 * Footer is omitted entirely when neither `primaryAction` nor `secondaryActions`
 * are provided.
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
    alwaysAllow,
    primaryAction,
    secondaryActions,
    children,
    'data-test-subj': dataTestSubj,
  }) => {
    const { euiTheme } = useEuiTheme();

    const defaultButtonColor: EuiButtonColor = tone === 'danger' ? 'danger' : 'primary';

    const hasFooter =
      primaryAction !== undefined ||
      (secondaryActions !== undefined && secondaryActions.length > 0);

    return (
      <>
        {showHeader && (
          <ApprovalModalHeader caption={caption} title={title} titleId={titleId ?? ''} />
        )}

        <div
          css={css({
            padding: `0 ${euiTheme.size.base}`,
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
        </div>

        {alwaysAllow && (
          <AlwaysAllowCheckbox
            option={alwaysAllow}
            data-test-subj={dataTestSubj ? `${dataTestSubj}-always-allow` : undefined}
          />
        )}

        {children}

        {hasFooter && (
          <div
            css={css({
              display: 'flex',
              gap: euiTheme.size.s,
              justifyContent: 'flex-end',
              padding: euiTheme.size.base,
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
                onClick={primaryAction.onClick}
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
