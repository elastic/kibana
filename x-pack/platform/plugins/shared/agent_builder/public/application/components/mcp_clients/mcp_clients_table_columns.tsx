/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiLink,
  EuiNotificationBadge,
  EuiText,
  EuiTextColor,
  type EuiBasicTableColumn,
  type EuiTableComputedColumnType,
  type EuiTableFieldDataColumnType,
} from '@elastic/eui';
import type { OAuthClient } from '@kbn/agent-builder-common';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import React, { useMemo } from 'react';
import { isEmpty } from 'lodash';
import { McpClientLogo } from '@kbn/agent-builder-browser';
import { useMcpClientsActions } from '../../context/mcp_clients_provider';
import { labels } from '../../utils/i18n';
import { McpClientStatusIndicator } from './mcp_client_status_indicator';
import { McpClientActionsMenu } from './mcp_client_actions_button';

export const useMcpClientsTableColumns = (): Array<EuiBasicTableColumn<OAuthClient>> => {
  const { viewClientDetails } = useMcpClientsActions();

  return useMemo(() => {
    const logoColumn: EuiTableComputedColumnType<OAuthClient> = {
      width: '48px',
      align: 'center',
      render: ({ client_logo }) => <McpClientLogo clientLogo={client_logo} />,
    };

    const nameColumn: EuiTableFieldDataColumnType<OAuthClient> = {
      field: 'client_name',
      width: '60%',
      name: labels.tools.mcpClients.name,
      sortable: true,
      render: (name: string, client) => {
        if (isEmpty(name)) {
          return (
            <EuiText size="s">
              <EuiTextColor color="subdued">–</EuiTextColor>
            </EuiText>
          );
        }
        return (
          <EuiText size="s">
            <EuiLink
              onClick={() => viewClientDetails(client, 'flyout')}
              data-test-subj={`mcpClientsListNameLink-${client.id}`}
              {...getEbtProps({
                element: AGENT_BUILDER_UI_EBT.element.pageContent,
                action: AGENT_BUILDER_UI_EBT.action.globalManagement.MCP_CLIENT_VIEW_DETAILS,
                detail: AGENT_BUILDER_UI_EBT.entity.MCP_CLIENT,
              })}
            >
              {name}
            </EuiLink>
          </EuiText>
        );
      },
    };

    const connectionsColumn: EuiTableFieldDataColumnType<OAuthClient> = {
      field: 'connections.active.length',
      name: labels.tools.mcpClients.connections,
      sortable: true,
      width: '20%',
      render: (activeConnectionCount: number) => (
        <EuiNotificationBadge color="subdued" size="m">
          {activeConnectionCount ?? 0}
        </EuiNotificationBadge>
      ),
    };

    const statusColumn: EuiTableFieldDataColumnType<OAuthClient> = {
      field: 'revoked',
      name: labels.tools.mcpClients.status,
      sortable: true,
      width: '20%',
      render: (revoked: boolean | undefined) => <McpClientStatusIndicator revoked={revoked} />,
    };

    const actionsColumn: EuiTableComputedColumnType<OAuthClient> = {
      width: '100px',
      align: 'right',
      name: labels.tools.mcpClients.actionsColumnLabel,
      render: ({ id, client_name, connections, revoked }) => (
        <McpClientActionsMenu
          clientId={id}
          clientName={client_name ?? id}
          connectionCount={connections?.active?.length ?? 0}
          revoked={revoked ?? false}
        />
      ),
    };

    return [logoColumn, nameColumn, connectionsColumn, statusColumn, actionsColumn];
  }, [viewClientDetails]);
};
