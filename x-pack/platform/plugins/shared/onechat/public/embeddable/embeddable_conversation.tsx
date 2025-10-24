/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { EmbeddableConversationInternalProps } from './types';
import { EmbeddableConversationProvider } from '../application/context/conversation/embeddable_conversation_provider';
import { Conversation } from '../application/components/conversations/conversation';
import { ConversationHeader } from '../application/components/conversations/conversation_header';

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
    flex-direction: column;
    justify-content: center;
    border: none;
    block-size: ${headerHeight};
  `;
  const contentStyles = css`
    ${backgroundStyles}
    width: 100%;
    height: 100%;
    max-block-size: calc(var(--kbn-application--content-height) - ${headerHeight});
  `;

  const labels = {
    header: i18n.translate('xpack.onechat.conversationsView.header', {
      defaultMessage: 'Conversation header',
    }),
    content: i18n.translate('xpack.onechat.conversationsView.content', {
      defaultMessage: 'Conversation content',
    }),
  };

  return (
    <EmbeddableConversationProvider {...props}>
      <KibanaPageTemplate>
        <KibanaPageTemplate.Header
          css={headerStyles}
          bottomBorder={false}
          aria-label={labels.header}
          paddingSize="m"
        >
          <ConversationHeader isSidebarOpen={false} onToggleSidebar={() => {}} />
        </KibanaPageTemplate.Header>
        <KibanaPageTemplate.Section
          paddingSize="none"
          grow
          contentProps={{
            css: contentStyles,
          }}
          aria-label={labels.content}
        >
          <Conversation />
        </KibanaPageTemplate.Section>
      </KibanaPageTemplate>
    </EmbeddableConversationProvider>
  );
};
