/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import {
  EuiAvatar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModalHeader,
  EuiTitle,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { useApprovalTone } from './use_approval_tone';
import { APPROVAL_MODAL_TRANSLATIONS } from './translations';

interface ApprovalModalHeaderProps {
  tone: 'primary' | 'danger';
  iconType: IconType;
  warningLabel: string;
  title: string;
  titleId: string;
}

export const ApprovalModalHeader = memo<ApprovalModalHeaderProps>(
  ({ tone, iconType, warningLabel, title, titleId }) => {
    const { euiTheme } = useEuiTheme();
    const { headerBackground, avatarBackground, warningLabelColor, headerBorder } =
      useApprovalTone(tone);

    return (
      <EuiModalHeader
        css={css({
          background: headerBackground,
          borderBottom: `1px solid ${headerBorder}`,
          flexDirection: 'column',
          alignItems: 'flex-start',
          padding: euiTheme.size.m,
        })}
      >
        <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiAvatar
              type="space"
              name={warningLabel ?? APPROVAL_MODAL_TRANSLATIONS.warningLabel}
              iconType={iconType}
              size="m"
              color={avatarBackground}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText
                  css={css({
                    fontWeight: euiTheme.font.weight.semiBold,
                    fontSize: `${euiTheme.font.scale.xs}${euiTheme.font.defaultUnits}`,
                    color: warningLabelColor,
                    letterSpacing: '0.06em',
                  })}
                >
                  <span>{warningLabel ?? APPROVAL_MODAL_TRANSLATIONS.warningLabel}</span>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiTitle id={titleId} size="xs">
                  <p>{title}</p>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalHeader>
    );
  }
);

ApprovalModalHeader.displayName = 'ApprovalModalHeader';
