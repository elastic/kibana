/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import { ChatInfoButton } from './chat_info_button';
import { ConversationRightActions } from './conversation_actions_right';
import { ConversationSharingButton } from './conversation_sharing_button';
import { ConversationTitle } from './conversation_title';
import { SetTypeControl } from './set_type_control';

const titleSlotStyles = css`
  min-width: 0;
`;

interface ConversationHeaderProps {
  onClose?: () => void;
  ariaLabelledBy?: string;
}
export const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  onClose,
  ariaLabelledBy,
}) => {
  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="spaceBetween"
      gutterSize="s"
      responsive={false}
    >
      {/* Left slot — conversation title */}
      <EuiFlexItem grow={true} css={titleSlotStyles}>
        <ConversationTitle ariaLabelledBy={ariaLabelledBy} />
      </EuiFlexItem>

      {/* Right slot — chat type control, then the existing actions menu */}
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <SetTypeControl />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <ConversationSharingButton />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <ChatInfoButton />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ConversationRightActions onClose={onClose} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
