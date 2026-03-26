/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { EuiPopover } from '@elastic/eui';
import React from 'react';
import { ConversationHistoryList } from './conversations_history_list';

interface ConversationsHistoryPopoverProps {
  button: React.ReactElement;
  isOpen: boolean;
  closePopover: () => void;
}

const popoverPanelStyles = css`
  width: 400px;
`;

export const ConversationsHistoryPopover: React.FC<ConversationsHistoryPopoverProps> = ({
  button,
  isOpen,
  closePopover,
}) => {
  return (
    <EuiPopover
      button={button}
      isOpen={isOpen}
      closePopover={closePopover}
      panelProps={{ css: popoverPanelStyles }}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <ConversationHistoryList onClose={closePopover} />
    </EuiPopover>
  );
};
