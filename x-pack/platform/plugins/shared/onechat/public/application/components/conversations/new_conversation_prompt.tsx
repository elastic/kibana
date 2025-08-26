/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ConversationContent } from './conversation_grid';

const fullHeightStyles = css`
  height: 100%;
`;

export const NewConversationPrompt: React.FC<{}> = () => {
  const { euiTheme } = useEuiTheme();
  const promptStyles = css`
    max-inline-size: calc(${euiTheme.size.l} * 19);
    padding: ${euiTheme.size.l};
    margin: 0 auto;
  `;
  const labels = {
    container: i18n.translate('xpack.onechat.newConversationPrompt.container', {
      defaultMessage: 'New conversation welcome prompt',
    }),
    title: i18n.translate('xpack.onechat.newConversationPrompt.title', {
      defaultMessage: 'How can I help today?',
    }),
    subtitle: i18n.translate('xpack.onechat.newConversationPrompt.subtitle', {
      defaultMessage:
        "Whether you're starting something new or jumping back into an old thread, I am ready when you are 💪",
    }),
  };
  return (
    <ConversationContent css={fullHeightStyles}>
      <EuiFlexGroup
        css={promptStyles}
        direction="column"
        alignItems="center"
        justifyContent="center"
        aria-label={labels.container}
      >
        <EuiFlexItem grow={false}>
          <EuiIcon color="primary" size="xxl" type="logoElastic" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle>
            <h2>{labels.title}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText textAlign="center" color="subdued">
            <p>{labels.subtitle}</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ConversationContent>
  );
};
