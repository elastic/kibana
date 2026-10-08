/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { CaseManagementIllustration } from './case_management_illustration';
import * as i18n from './translations';

interface Props {
  onStartTour: () => void;
  onDismiss: () => void;
}

/**
 * A dismissible "what's new" banner shown at the top of the redesigned cases list. Introduces
 * the redesign and offers a guided tour. Modeled on the Attacks page welcome callout.
 */
export const CasesListWelcomeBanner: React.FC<Props> = ({ onStartTour, onDismiss }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <EuiPanel
        hasBorder
        hasShadow={false}
        paddingSize="m"
        color="plain"
        data-test-subj="cases-list-welcome-banner"
        css={css`
          position: relative;
          background-color: ${euiTheme.colors.backgroundBaseHighlighted};
        `}
      >
        <EuiToolTip content={i18n.BANNER_DISMISS} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="cross"
            color="text"
            aria-label={i18n.BANNER_DISMISS}
            onClick={onDismiss}
            data-test-subj="cases-list-welcome-banner-dismiss"
            css={css`
              position: absolute;
              top: ${euiTheme.size.s};
              right: ${euiTheme.size.s};
            `}
          />
        </EuiToolTip>
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <CaseManagementIllustration alt={i18n.BANNER_ILLUSTRATION_ALT} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h2>{i18n.BANNER_TITLE}</h2>
            </EuiTitle>
            <EuiSpacer size="xs" />
            <EuiText size="s" color="subdued">
              <p>{i18n.BANNER_DESCRIPTION}</p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  onClick={onStartTour}
                  data-test-subj="cases-list-welcome-banner-start-tour"
                >
                  {i18n.BANNER_START_TOUR}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <EuiSpacer size="l" />
    </>
  );
};
CasesListWelcomeBanner.displayName = 'CasesListWelcomeBanner';
