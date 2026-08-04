/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { ConversationActionButton } from './conversation_action_button';
import { ConnectorSelector } from './connector_selector';
import { AttachImageButton } from './attach_image_button';

const connectorFlexItemStyles = css`
  flex-shrink: 1;
  min-width: 0;
  overflow: hidden;
`;

interface InputActionsProps {
  onSubmit: () => void;
  isSubmitDisabled: boolean;
  resetToPendingMessage: () => void;
  agentId?: string;
  showAttachButton?: boolean;
}

export const InputActions: React.FC<InputActionsProps> = ({
  onSubmit,
  isSubmitDisabled,
  resetToPendingMessage,
  agentId,
  showAttachButton = true,
}) => (
  <EuiFlexItem grow={false}>
    <EuiFlexGroup
      gutterSize="s"
      responsive={false}
      alignItems="center"
      justifyContent="spaceBetween"
    >
      <EuiFlexItem grow={false} css={connectorFlexItemStyles}>
        <ConnectorSelector />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="m" responsive={false} alignItems="center">
          {showAttachButton && (
            <EuiFlexItem grow={false}>
              <AttachImageButton />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <ConversationActionButton
              onSubmit={onSubmit}
              isSubmitDisabled={isSubmitDisabled}
              resetToPendingMessage={resetToPendingMessage}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiFlexItem>
);
