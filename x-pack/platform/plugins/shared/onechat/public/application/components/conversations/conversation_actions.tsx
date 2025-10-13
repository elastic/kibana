/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiPageHeaderSection, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { NewConversationButton } from './new_conversation_button';
import { appPaths } from '../../utils/app_paths';
import { useNavigation } from '../../hooks/use_navigation';
import { useConversationId } from '../../hooks/use_conversation_id';

export const ConversationActions: React.FC<{}> = () => {
  const { euiTheme } = useEuiTheme();
  const { createOnechatUrl } = useNavigation();
  const conversationId = useConversationId();

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
      <EuiButton
        aria-label={''}
        href={createOnechatUrl(
          appPaths.evaluations.conversation({ conversationId: conversationId! })
        )}
      >
        Evaluate Chat
      </EuiButton>
      <NewConversationButton />
    </EuiPageHeaderSection>
  );
};
