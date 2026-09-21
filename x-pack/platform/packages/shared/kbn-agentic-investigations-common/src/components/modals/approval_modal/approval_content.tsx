/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import { EuiButton, EuiButtonEmpty, useEuiTheme, type EuiButtonColor } from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { ApprovalModalHeader } from './approval_modal_header';
import { BlastRadiusSection } from './blast_radius_section';
import type { BlastRadiusContent } from './blast_radius_section';
import { ApprovalActorRow } from './approval_actor_row';
import { AlwaysAllowCheckbox } from './always_allow_checkbox';
import { APPROVAL_MODAL_TRANSLATIONS } from './translations';

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
  /** Used for the header avatar, the blast-radius default icon colour, and (fallback) the primary-action button icon. */
  iconType: IconType;
  blastRadius: BlastRadiusContent;
  /** Optional prose rendered above the blast radius section. */
  description?: React.ReactNode;
  /**
   * Show the avatar + warning-label + title header.
   * Set to `false` when a host (e.g. Agent Builder attachment framework) already draws its own header.
   * @default true
   */
  showHeader?: boolean;
  titleId?: string;
  warningLabel?: string;
  /**
   * Show the actor row (who is acting) below the blast radius.
   * @default true
   */
  showActorRow?: boolean;
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
    blastRadius,
    description,
    showHeader = true,
    titleId,
    warningLabel,
    showActorRow = true,
    alwaysAllow,
    primaryAction,
    secondaryActions,
    children,
    'data-test-subj': dataTestSubj,
  }) => {
    const { euiTheme } = useEuiTheme();

    const iconColor = tone === 'danger' ? euiTheme.colors.danger : euiTheme.colors.primary;
    const defaultButtonColor: EuiButtonColor = tone === 'danger' ? 'danger' : 'primary';

    const hasFooter =
      primaryAction !== undefined ||
      (secondaryActions !== undefined && secondaryActions.length > 0);

    return (
      <>
        {showHeader && (
          <ApprovalModalHeader
            tone={tone}
            iconType={iconType}
            warningLabel={warningLabel ?? APPROVAL_MODAL_TRANSLATIONS.warningLabel}
            title={title}
            titleId={titleId ?? ''}
          />
        )}

        <div css={css({ padding: `${euiTheme.size.m} 0` })}>
          {description !== undefined && (
            <div css={css({ marginBottom: euiTheme.size.m })}>{description}</div>
          )}
          <BlastRadiusSection content={blastRadius} defaultItemIconColor={iconColor} />
          {showActorRow && <ApprovalActorRow />}
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
              justifyContent: 'flex-start',
              padding: euiTheme.size.m,
              borderTop: `1px solid ${euiTheme.colors.lightestShade}`,
            })}
          >
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
            {secondaryActions?.map((action, i) => (
              <EuiButtonEmpty
                key={i}
                size="s"
                color={action.color ?? 'text'}
                isDisabled={action.isDisabled}
                isLoading={action.isLoading}
                onClick={action.onClick}
                data-test-subj={action['data-test-subj']}
              >
                {action.label}
              </EuiButtonEmpty>
            ))}
          </div>
        )}
      </>
    );
  }
);

ApprovalContent.displayName = 'ApprovalContent';
