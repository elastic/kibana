/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { Conversation } from '../../..';
import { AssistantAnimatedIcon } from '../assistant_animated_icon';
import { ConnectorSetup } from '../../connectorland/connector_setup';
import * as i18n from '../translations';

interface Props {
  currentConversation: Conversation | undefined;
  handleOnConversationSelected: ({ cId, cTitle }: { cId: string; cTitle: string }) => Promise<void>;
}

export const WelcomeSetup: React.FC<Props> = ({
  handleOnConversationSelected,
  currentConversation,
}) => {
  return (
    <EuiFlexGroup alignItems="center" justifyContent="center">
      <EuiFlexItem grow={false}>
        <EuiPanel
          hasShadow={false}
          css={css`
            text-align: center;
          `}
        >
          <EuiFlexGroup
            alignItems="center"
            justifyContent="center"
            direction="column"
            data-test-subj="welcome-setup"
          >
            <EuiFlexItem grow={false}>
              <AssistantAnimatedIcon />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText>
                <h3>{i18n.WELCOME_SCREEN_TITLE}</h3>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText
                color="subdued"
                css={css`
                  max-width: 400px;
                `}
              >
                <p>{i18n.WELCOME_SCREEN_DESCRIPTION}</p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false} data-test-subj="connector-prompt">
              <ConnectorSetup
                conversation={currentConversation}
                onConversationUpdate={handleOnConversationSelected}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
