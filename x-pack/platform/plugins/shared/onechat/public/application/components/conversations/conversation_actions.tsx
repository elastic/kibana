/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageHeaderSection, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { NewConversationButton } from './new_conversation_button';
import { useConversation } from '../../hooks/use_conversation';
import { conversationsCommonLabels } from './i18n';

export const ConversationActions: React.FC<{}> = () => {
  const { conversation } = useConversation();
  const { euiTheme } = useEuiTheme();

  if (!conversation) {
    return null;
  }

  const actionsContainerStyles = css`
    display: flex;
    flex-direction: row;
    gap: ${euiTheme.size.s};
    align-items: center;
    justify-self: end;
  `;

  const labels = conversationsCommonLabels.header.actions;

  return (
    <EuiPageHeaderSection css={actionsContainerStyles} aria-label={labels.ariaLabel}>
      <NewConversationButton />
    </EuiPageHeaderSection>
  );
};
