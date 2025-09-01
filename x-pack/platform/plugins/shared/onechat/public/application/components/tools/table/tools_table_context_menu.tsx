/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ToolDefinitionWithSchema } from '@kbn/onechat-common';
import { isEsqlTool } from '@kbn/onechat-common/tools';
import React, { useState } from 'react';
import { labels } from '../../../utils/i18n';
import { useToolsActions } from '../../../context/tools_table_provider';

export interface ToolContextMenuProps {
  tool: ToolDefinitionWithSchema;
}

export const ToolContextMenu = ({ tool }: ToolContextMenuProps) => {
  const { euiTheme } = useEuiTheme();
  const { editTool, deleteTool, testTool, cloneTool } = useToolsActions();
  const [isOpen, setIsOpen] = useState(false);

  const editMenuItem = (
    <EuiContextMenuItem
      icon="documentEdit"
      key="edit"
      size="s"
      onClick={() => {
        editTool(tool.id);
        setIsOpen(false);
      }}
    >
      {labels.tools.editToolButtonLabel}
    </EuiContextMenuItem>
  );

  const deleteMenuItem = (
    <EuiContextMenuItem
      icon="trash"
      key="delete"
      size="s"
      css={css`
        color: ${euiTheme.colors.textDanger};
      `}
      onClick={() => {
        deleteTool(tool.id);
        setIsOpen(false);
      }}
    >
      {labels.tools.deleteToolButtonLabel}
    </EuiContextMenuItem>
  );

  const testMenuItem = (
    <EuiContextMenuItem
      icon="eye"
      key="test"
      size="s"
      disabled // Not implemented
      onClick={() => {
        testTool(tool.id);
        setIsOpen(false);
      }}
    >
      {labels.tools.testToolButtonLabel}
    </EuiContextMenuItem>
  );

  const cloneMenuItem = (
    <EuiContextMenuItem
      icon="copy"
      key="clone"
      size="s"
      onClick={() => {
        cloneTool(tool.id);
        setIsOpen(false);
      }}
    >
      {labels.tools.cloneToolButtonLabel}
    </EuiContextMenuItem>
  );

  const menuItems = isEsqlTool(tool)
    ? [editMenuItem, testMenuItem, cloneMenuItem, deleteMenuItem]
    : [testMenuItem];

  return (
    <EuiPopover
      id={`${tool.id}_context-menu`}
      panelPaddingSize="s"
      button={
        <EuiButtonIcon
          iconType="boxesHorizontal"
          onClick={() => setIsOpen((openState) => !openState)}
          aria-label={labels.tools.toolContextMenuButtonLabel}
        />
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
    >
      <EuiContextMenuPanel size="s" items={menuItems} />
    </EuiPopover>
  );
};
