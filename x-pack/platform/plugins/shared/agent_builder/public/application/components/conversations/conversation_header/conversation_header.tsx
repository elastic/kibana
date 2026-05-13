/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { ConversationRightActions } from './conversation_actions_right';
import { ConversationTitle } from './conversation_title';

const headerGridStyles = css`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  width: 100%;
`;

const rightActionsStyles = css`
  justify-self: end;
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
    <div css={headerGridStyles}>
      {/* Left column — intentionally empty, reserved for future actions */}
      <div />

      {/* Center column — always exactly centered */}
      <ConversationTitle ariaLabelledBy={ariaLabelledBy} />

      {/* Right column — right-aligned within its 1fr column */}
      <div css={rightActionsStyles}>
        <ConversationRightActions onClose={onClose} />
      </div>
    </div>
  );
};
