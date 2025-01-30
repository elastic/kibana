/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { AssistantAvatar } from '@kbn/ai-assistant-icon';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React from 'react';
import { useActions } from '../state';
import { Steps } from './steps';
import * as i18n from './translations';

const useAvatarCss = () => {
  const { euiTheme } = useEuiTheme();
  return css`
    border: 1px solid ${euiTheme.colors.lightShade};
    padding: ${euiTheme.size.xs};
  `;
};

const contentCss = css`
  width: 100%;
  max-width: 730px;
`;

interface HeaderProps {
  currentStep: number;
  isGenerating: boolean;
}
export const Header = React.memo<HeaderProps>(({ currentStep, isGenerating }) => {
  const { setStep } = useActions();
  const avatarCss = useAvatarCss();

  return (
    <KibanaPageTemplate.Header>
      <EuiFlexGroup direction="column" alignItems="center">
        <EuiFlexItem css={contentCss}>
          <EuiFlexGroup direction="column" gutterSize="l">
            <EuiFlexItem>
              <EuiSpacer size="s" />
              <EuiFlexGroup
                direction="row"
                alignItems="center"
                gutterSize="s"
                justifyContent="center"
              >
                <EuiFlexItem grow={false}>
                  <AssistantAvatar css={avatarCss} name={i18n.ASSISTANT_AVATAR} />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText>
                    <h1>
                      <span>{i18n.TITLE}</span>
                    </h1>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <Steps currentStep={currentStep} setStep={setStep} isGenerating={isGenerating} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </KibanaPageTemplate.Header>
  );
});
Header.displayName = 'Header';
