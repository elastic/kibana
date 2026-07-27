/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  EuiToolTip,
} from '@elastic/eui';
import useToggle from 'react-use/lib/useToggle';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import { useMcpClientsActions } from '../../context/mcp_clients_provider';
import { labels } from '../../utils/i18n';

export interface McpClientActionsMenuProps {
  clientId: string;
  clientName: string;
  connectionCount: number;
  revoked: boolean;
}

export const McpClientActionsMenu = ({
  clientId,
  clientName,
  connectionCount,
  revoked,
}: McpClientActionsMenuProps) => {
  const [isOpen, toggleOpen] = useToggle(false);
  const { revokeMcpClient } = useMcpClientsActions();

  const closePopover = useCallback(() => toggleOpen(false), [toggleOpen]);

  const handleRevoke = useCallback(() => {
    closePopover();
    revokeMcpClient(clientId, clientName, connectionCount);
  }, [closePopover, revokeMcpClient, clientId, clientName, connectionCount]);

  const menuItems = [
    <EuiContextMenuItem
      key="revoke"
      icon="trash"
      color="danger"
      onClick={handleRevoke}
      data-test-subj={`mcpClientRevokeAction-${clientId}`}
      {...getEbtProps({
        element: AGENT_BUILDER_UI_EBT.element.pageContent,
        action: AGENT_BUILDER_UI_EBT.action.globalManagement.MCP_CLIENT_REVOKE_OPEN,
        detail: AGENT_BUILDER_UI_EBT.entity.MCP_CLIENT,
      })}
    >
      {labels.tools.mcpClients.actions.revoke}
    </EuiContextMenuItem>,
  ];

  return (
    <EuiPopover
      aria-label={labels.tools.mcpClients.actions.ariaLabel}
      button={
        <EuiToolTip content={labels.tools.mcpClients.actions.ariaLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="boxesVertical"
            color="text"
            aria-label={labels.tools.mcpClients.actions.ariaLabel}
            onClick={toggleOpen}
            isDisabled={revoked}
            data-test-subj={`agentBuilderMcpClientsListActions-${clientId}`}
          />
        </EuiToolTip>
      }
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downRight"
    >
      <EuiContextMenuPanel items={menuItems} />
    </EuiPopover>
  );
};
