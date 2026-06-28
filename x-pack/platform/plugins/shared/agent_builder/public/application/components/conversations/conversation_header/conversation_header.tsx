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
  grid-template-columns: auto 1fr;
  justify-content: space-between;
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
      <ConversationTitle ariaLabelledBy={ariaLabelledBy} />
      <div css={rightActionsStyles}>
        <ConversationRightActions onClose={onClose} />
      </div>
    </div>
  );
};
