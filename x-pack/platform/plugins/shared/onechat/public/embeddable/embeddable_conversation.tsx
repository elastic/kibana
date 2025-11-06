/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { EmbeddableConversationInternalProps } from './types';
import { EmbeddableConversationsProvider } from '../application/context/conversation/embeddable_conversations_provider';
import { Conversation } from '../application/components/conversations/conversation';
import { EmbeddableConversationHeader } from './embeddable_conversation_header';

export const EmbeddableConversationInternal: React.FC<EmbeddableConversationInternalProps> = (
  props
) => {
  const { euiTheme } = useEuiTheme();

  const backgroundStyles = css`
    background-color: ${euiTheme.colors.backgroundBasePlain};
  `;

  const headerHeight = `calc(${euiTheme.size.xl} * 2)`;
  const headerStyles = css`
    ${backgroundStyles}
    display: flex;
    align-items: center;
    block-size: ${headerHeight};
    padding: 0 ${euiTheme.size.base};
  `;
  const contentStyles = css`
    ${backgroundStyles}
    width: 100%;
    height: 100%;
    max-block-size: calc(var(--kbn-application--content-height) - ${headerHeight});
    display: flex;
    justify-content: center;
    align-items: center;
  `;

  return (
    <EmbeddableConversationsProvider {...props}>
      <div css={headerStyles}>
        <EmbeddableConversationHeader />
      </div>
      <div css={contentStyles}>
        <Conversation />
      </div>
    </EmbeddableConversationsProvider>
  );
};
