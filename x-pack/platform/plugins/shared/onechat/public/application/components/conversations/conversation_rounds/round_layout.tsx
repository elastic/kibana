/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ReactNode } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import useObservable from 'react-use/lib/useObservable';
import type { ClientMessage } from '@kbn/elastic-assistant';
import { useOnechatServices } from '../../../hooks/use_onechat_service';

interface RoundLayoutProps {
  input: ReactNode;
  outputIcon: ReactNode;
  output: ReactNode;
  message?: ClientMessage; // Add message prop to pass to comment actions
}

const labels = {
  container: i18n.translate('xpack.onechat.round.container', {
    defaultMessage: 'Conversation round',
  }),
  userMessage: i18n.translate('xpack.onechat.round.userInput', {
    defaultMessage: 'User input',
  }),
};

export const RoundLayout: React.FC<RoundLayoutProps> = ({ input, outputIcon, output, message }) => {
  const { euiTheme } = useEuiTheme();
  const { conversationSettingsService } = useOnechatServices();

  // Subscribe to conversation settings to get the commentActionsMounter
  const conversationSettings = useObservable(
    conversationSettingsService.getConversationSettings$(),
    {}
  );

  const commentActionsMounter = conversationSettings?.commentActionsMounter;

  const inputContainerStyles = css`
    width: 100%;
    align-self: end;
    max-inline-size: 80%;
    background-color: ${euiTheme.colors.backgroundBasePrimary};
  `;

  return (
    <EuiFlexGroup direction="column" gutterSize="l" aria-label={labels.container}>
      <EuiFlexItem grow={false}>
        <EuiPanel
          css={inputContainerStyles}
          paddingSize="m"
          hasShadow={false}
          hasBorder={false}
          aria-label={labels.userMessage}
        >
          {input}
        </EuiPanel>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="row" gutterSize="m">
          <EuiFlexItem grow={false}>{outputIcon}</EuiFlexItem>
          <EuiFlexItem>{output}</EuiFlexItem>
          {/* Render comment actions if available and message is provided */}
          {commentActionsMounter && output && (
            <EuiFlexItem grow={false}>{commentActionsMounter({ message: output })}</EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
