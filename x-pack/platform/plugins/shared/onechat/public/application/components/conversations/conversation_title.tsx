/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle, EuiPageHeaderSection, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useConversation } from '../../hooks/use_conversation';
import { conversationsCommonLabels } from './i18n';

export const ConversationTitle: React.FC<{}> = () => {
  const { conversation } = useConversation();
  const { euiTheme } = useEuiTheme();

  if (!conversation) {
    return null;
  }

  const sectionStyles = css`
    display: flex;
    flex-direction: row;
    gap: ${euiTheme.size.s};
  `;
  const { title } = conversation;

  return (
    <EuiPageHeaderSection css={sectionStyles}>
      <EuiTitle
        aria-label={conversationsCommonLabels.header.conversationTitle.ariaLabel}
        size="xxs"
      >
        <h1>
          {title || conversationsCommonLabels.header.conversationTitle.newConversationDisplay}
        </h1>
      </EuiTitle>
    </EuiPageHeaderSection>
  );
};
