/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ConversationRightActions } from './conversation_actions_right';
import { ConversationTitle } from './conversation_title';
import { useConversationReadOnly } from '../../../hooks/use_conversation';

const titleSlotStyles = css`
  min-width: 0;
`;

const labels = {
  readOnly: i18n.translate('xpack.agentBuilder.conversationHeader.readOnly', {
    defaultMessage: 'Read-Only',
  }),
};

const ConversationReadOnlyBadge = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiBadge
      color={euiTheme.colors.lightShade}
      iconType="lock"
      data-test-subj="agentBuilderConversationReadOnlyBadge"
      css={css`
        color: ${euiTheme.colors.text};
      `}
    >
      {labels.readOnly}
    </EuiBadge>
  );
};

interface ConversationHeaderProps {
  ariaLabelledBy?: string;
}
export const ConversationHeader = ({ ariaLabelledBy }: ConversationHeaderProps) => {
  const { isReadOnly } = useConversationReadOnly();

  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="spaceBetween"
      gutterSize="s"
      responsive={false}
    >
      <EuiFlexItem grow={true} css={titleSlotStyles}>
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false} css={titleSlotStyles}>
            <ConversationTitle ariaLabelledBy={ariaLabelledBy} />
          </EuiFlexItem>
          {isReadOnly && (
            <EuiFlexItem grow={false}>
              <ConversationReadOnlyBadge />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ConversationRightActions />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
