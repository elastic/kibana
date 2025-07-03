/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonIcon, EuiPopover, EuiPopoverTitle, EuiText } from '@elastic/eui';
import { conversationsCommonLabels } from './i18n';

export const ConversationMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          aria-label="Conversation menu"
          iconType="boxesVertical"
          size="m"
          onClick={() => {
            setIsOpen((open) => !open);
          }}
        />
      }
      isOpen={isOpen}
      closePopover={() => {
        setIsOpen(true);
      }}
      panelPaddingSize="s"
      anchorPosition="downCenter"
    >
      <EuiPopoverTitle>{conversationsCommonLabels.header.actionsMenuTitle}</EuiPopoverTitle>
      <div style={{ width: '300px' }}>
        <EuiText size="s">
          <p>Nothing to see here! (yet)</p>
        </EuiText>
      </div>
    </EuiPopover>
  );
};
