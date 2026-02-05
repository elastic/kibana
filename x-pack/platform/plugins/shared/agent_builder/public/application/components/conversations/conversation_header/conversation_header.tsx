/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ConversationRightActions } from './conversation_actions_right';
import { ConversationLeftActions } from './conversation_actions_left';
import { ConversationTitle } from './conversation_title';

const centerSectionStyles = css`
  align-items: center;
`;

interface ConversationHeaderProps {
  onClose?: () => void;
  ariaLabelledBy?: string;
}
export const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  onClose,
  ariaLabelledBy,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <EuiFlexGroup alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <ConversationLeftActions />
      </EuiFlexItem>
      <EuiFlexItem grow={true} css={centerSectionStyles}>
        <ConversationTitle
          ariaLabelledBy={ariaLabelledBy}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ConversationRightActions
          onClose={onClose}
          onRenameConversation={() => setIsEditing(true)}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
