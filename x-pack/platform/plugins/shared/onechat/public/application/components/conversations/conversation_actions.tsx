/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageHeaderSection, useEuiTheme, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import useObservable from 'react-use/lib/useObservable';
import { useOnechatServices } from '../../hooks/use_onechat_service';
import { useHasActiveConversation } from '../../hooks/use_conversation';
import { NewConversationButton } from './new_conversation_button';

export const ConversationActions: React.FC<{}> = () => {
  const { euiTheme } = useEuiTheme();
  const { conversationSettingsService } = useOnechatServices();
  const hasActiveConversation = useHasActiveConversation();

  // Subscribe to conversation settings to get the settingsMenuComponent
  const conversationSettings = useObservable(
    conversationSettingsService.getConversationSettings$(),
    {}
  );

  const settingsMenuComponent = conversationSettings?.settingsMenuComponent;
  const isFlyoutMode = conversationSettings?.isFlyoutMode;

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
      <EuiFlexGroup>
        {hasActiveConversation && (
          <EuiFlexItem grow={false}>
            <NewConversationButton />
          </EuiFlexItem>
        )}
        {settingsMenuComponent && <EuiFlexItem grow={false}>{settingsMenuComponent}</EuiFlexItem>}
      </EuiFlexGroup>
    </EuiPageHeaderSection>
  );
};
