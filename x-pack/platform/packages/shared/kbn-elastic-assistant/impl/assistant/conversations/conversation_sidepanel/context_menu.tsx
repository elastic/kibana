/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiContextMenuItemProps } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  useGeneratedHtmlId,
} from '@elastic/eui';
import * as i18n from './translations';

type ListGroupAction = EuiContextMenuItemProps & { key: string };

interface ConversationSidePanelContextMenuProps {
  actions: ListGroupAction[];
}

export const ConversationSidePanelContextMenu = ({
  actions,
}: ConversationSidePanelContextMenuProps) => {
  const [isPopoverOpen, setPopoverOpen] = useState(false);

  const buttonId = useGeneratedHtmlId({ prefix: 'listGroupItemActionsButton' });
  const menuId = useGeneratedHtmlId({ prefix: 'listGroupItemActionsMenu' });

  const closePopover = () => setPopoverOpen(false);

  // For context menu, only use actions with label
  const actionItems = actions.map(({ key, children, icon, onClick }) => (
    <EuiContextMenuItem
      key={key}
      data-test-subj={`convo-context-menu-item-${key}`}
      icon={icon}
      onClick={(e) => {
        onClick?.(e);
        closePopover();
      }}
    >
      {children}
    </EuiContextMenuItem>
  ));

  return (
    <EuiPopover
      panelPaddingSize="none"
      button={
        <EuiButtonIcon
          data-test-subj={`convo-context-menu-button`}
          size="xs"
          iconType="boxesVertical"
          iconSize="s"
          aria-label={i18n.CONVERSATION_CONTEXT_MENU}
          aria-haspopup="true"
          aria-controls={menuId}
          aria-expanded={isPopoverOpen}
          color="text"
          id={buttonId}
          onClick={() => setPopoverOpen(!isPopoverOpen)}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="rightUp"
      panelProps={{
        id: menuId,
        'aria-labelledby': buttonId,
      }}
    >
      <EuiContextMenuPanel data-test-subj="convo-context-menu" size="s" items={actionItems} />
    </EuiPopover>
  );
};
