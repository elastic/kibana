/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlyoutBody, EuiFlyoutHeader, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { EmbeddableConversationInternalProps } from './types';
import { EmbeddableConversationsProvider } from '../application/context/conversation/embeddable_conversations_provider';
import { Conversation } from '../application/components/conversations/conversation';
import { ConversationHeader } from '../application/components/conversations/conversation_header/conversation_header';

export const EmbeddableConversationInternal: React.FC<EmbeddableConversationInternalProps> = (
  props
) => {
  const { euiTheme } = useEuiTheme();
  const { onClose, ariaLabelledBy } = props;

  const backgroundStyles = css`
    background-color: ${euiTheme.colors.backgroundBasePlain};
  `;

  const headerStyles = css`
    ${backgroundStyles}
    &.euiFlyoutHeader {
      padding-inline: 0;
      padding-block-start: 0;
      padding: ${euiTheme.size.base};
    }
  `;
  const bodyStyles = css`
    ${backgroundStyles}
    flex: 1;

    .euiFlyoutBody__overflow {
      overflow: hidden;
      height: 100%;
    }

    .euiFlyoutBody__overflowContent {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100%;
      overflow: hidden;
      padding: 0;
    }
  `;

  return (
    <EmbeddableConversationsProvider {...props}>
      <EuiFlyoutHeader css={headerStyles}>
        <ConversationHeader onClose={onClose} ariaLabelledBy={ariaLabelledBy} />
      </EuiFlyoutHeader>
      <EuiFlyoutBody css={bodyStyles}>
        <Conversation />
      </EuiFlyoutBody>
    </EmbeddableConversationsProvider>
  );
};
