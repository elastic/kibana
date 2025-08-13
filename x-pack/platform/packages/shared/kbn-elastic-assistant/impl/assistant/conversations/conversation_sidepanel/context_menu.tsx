/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuItemProps,
  EuiContextMenuPanel,
  EuiListGroupItemProps,
  EuiPopover,
  useGeneratedHtmlId,
} from '@elastic/eui';

type ListGroupAction = EuiContextMenuItemProps & { key: string };

interface ConversationSidePanelContextMenuProps extends EuiListGroupItemProps {
  actions: ListGroupAction[];
}

export const ConversationSidePanelContextMenu = ({
  actions = [],
  label,
  ...props
}: ConversationSidePanelContextMenuProps) => {
  const [isPopoverOpen, setPopoverOpen] = useState(false);

  const buttonId = useGeneratedHtmlId({ prefix: 'listGroupItemActionsButton' });
  const menuId = useGeneratedHtmlId({ prefix: 'listGroupItemActionsMenu' });

  const closePopover = () => setPopoverOpen(false);

  // For context menu, only use actions with label
  const actionItems = actions.map(({ key, children, icon, onClick }) => (
    <EuiContextMenuItem
      key={key}
      icon={icon}
      onClick={(e) => {
        onClick?.(e);
        closePopover();
      }}
    >
      {children}
    </EuiContextMenuItem>
  ));
  console.log('actionItems', actionItems);
  return (
    <EuiPopover
      panelPaddingSize="none"
      button={
        <EuiButtonIcon
          size="xs"
          iconType="boxesVertical"
          iconSize="s"
          aria-label={`Show actions for ${label}`}
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
