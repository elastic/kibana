/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel, EuiText, EuiTitle } from '@elastic/eui';

export interface InvestigationCardProps {
  title: string;
  icon: string;
  /** Badges next to the title: type, sub-type, counts. */
  badges?: React.ReactNode;
  /** One short line under the title. */
  subtitle?: string;
  /** Opens what the card stands for. Without it the card is plain. */
  onClick?: () => void;
  'data-test-subj'?: string;
  children?: React.ReactNode;
}

/** A clickable card for one thing an investigation found, drawn like the chat's other cards. */
export const InvestigationCard: React.FC<InvestigationCardProps> = ({
  title,
  icon,
  badges,
  subtitle,
  onClick,
  children,
  'data-test-subj': dataTestSubj,
}) => (
  <EuiPanel
    hasBorder
    hasShadow={false}
    paddingSize="m"
    borderRadius="m"
    data-test-subj={dataTestSubj ?? 'agenticInvestigationsCard'}
  >
    {/* Only the header opens what the card stands for; the body has its own controls. */}
    <div
      {...(onClick
        ? {
            role: 'button',
            tabIndex: 0,
            'aria-label': title,
            onClick,
            onKeyDown: (event: React.KeyboardEvent) => {
              if (
                event.target === event.currentTarget &&
                (event.key === 'Enter' || event.key === ' ')
              ) {
                event.preventDefault();
                onClick();
              }
            },
            css: css`
              cursor: pointer;
            `,
          }
        : {})}
      data-test-subj={`${dataTestSubj ?? 'agenticInvestigationsCard'}Header`}
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiIcon type={icon} aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h4>{title}</h4>
          </EuiTitle>
        </EuiFlexItem>
        {badges && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
              {badges}
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
        <EuiFlexItem />
        {onClick && (
          <EuiFlexItem grow={false}>
            <EuiIcon type="chevronSingleRight" color="subdued" aria-hidden={true} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      {subtitle && (
        <EuiText size="xs" color="subdued">
          <p>{subtitle}</p>
        </EuiText>
      )}
    </div>
    {children}
  </EuiPanel>
);
