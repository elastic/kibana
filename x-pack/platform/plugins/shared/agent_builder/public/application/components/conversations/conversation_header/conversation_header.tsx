/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/react';
import { ConversationRightActions } from './conversation_actions_right';
import { ConversationTitle } from './conversation_title';

const titleSlotStyles = css`
  min-width: 0;
`;

interface ConversationHeaderProps {
  ariaLabelledBy?: string;
}
export const ConversationHeader = ({ ariaLabelledBy }: ConversationHeaderProps) => {
  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="spaceBetween"
      gutterSize="s"
      responsive={false}
    >
      <EuiFlexItem grow={true} css={titleSlotStyles}>
        <ConversationTitle ariaLabelledBy={ariaLabelledBy} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ConversationRightActions />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
