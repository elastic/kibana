/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageHeaderSection, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { NewConversationButton } from './new_conversation_button';

export const ConversationActions: React.FC<{}> = () => {
  const { euiTheme } = useEuiTheme();

  const actionsContainerStyles = css`
    display: flex;
    flex-direction: row;
    gap: ${euiTheme.size.s};
    align-items: center;
    justify-self: end;
  `;

  const labels = {
    container: i18n.translate('xpack.onechat.conversationActions.container', {
      defaultMessage: 'Conversation actions',
    }),
  };

  return (
    <EuiPageHeaderSection css={actionsContainerStyles} aria-label={labels.container}>
      <NewConversationButton />
    </EuiPageHeaderSection>
  );
};
