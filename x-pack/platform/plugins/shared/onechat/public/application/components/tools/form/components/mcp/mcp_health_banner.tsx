/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiCallOut, EuiFlexGroup, EuiSpacer, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { McpUnhealthyStatus } from '../../types/mcp';
import { McpHealthStatus } from '../../types/mcp';

const mcpHealthI18nMessages = {
  toolNotFound: {
    title: i18n.translate('xpack.onechat.tools.mcpHealthBanner.toolNotFound.title', {
      defaultMessage: 'Tool not found on MCP server',
    }),
    description: i18n.translate('xpack.onechat.tools.mcpHealthBanner.toolNotFound.description', {
      defaultMessage:
        'The tool below no longer exists on the selected MCP server. It may have been removed or renamed.',
    }),
  },
  connectorNotFound: {
    title: i18n.translate('xpack.onechat.tools.mcpHealthBanner.connectorNotFound.title', {
      defaultMessage: 'MCP connector unavailable',
    }),
    description: i18n.translate(
      'xpack.onechat.tools.mcpHealthBanner.connectorNotFound.description',
      {
        defaultMessage:
          'The MCP connector used by this tool is no longer available. Please create a new tool.',
      }
    ),
  },
  listToolsFailed: {
    title: i18n.translate('xpack.onechat.tools.mcpHealthBanner.listToolsFailed.title', {
      defaultMessage: "Can't retrieve tools from MCP server",
    }),
    description: i18n.translate('xpack.onechat.tools.mcpHealthBanner.listToolsFailed.description', {
      defaultMessage:
        "We're unable to fetch tools from this MCP server. This is usually caused by a connection or configuration issue with the MCP connector.",
    }),
  },
  toolUnhealthy: {
    title: i18n.translate('xpack.onechat.tools.mcpHealthBanner.toolUnhealthy.title', {
      defaultMessage: 'Tool execution failed',
    }),
    description: i18n.translate('xpack.onechat.tools.mcpHealthBanner.toolUnhealthy.description', {
      defaultMessage:
        'This tool encountered an error while running in Agent Builder. Please verify the MCP connector configuration and try again.',
    }),
  },
  deleteToolButtonLabel: i18n.translate(
    'xpack.onechat.tools.mcpHealthBanner.deleteToolButtonLabel',
    {
      defaultMessage: 'Delete this tool',
    }
  ),
  createNewToolButtonLabel: i18n.translate(
    'xpack.onechat.tools.mcpHealthBanner.createNewToolButtonLabel',
    {
      defaultMessage: 'Create a new tool',
    }
  ),
  viewConnectorsButtonLabel: i18n.translate(
    'xpack.onechat.tools.mcpHealthBanner.viewConnectorsButtonLabel',
    {
      defaultMessage: 'View connectors',
    }
  ),
  viewMcpServerButtonLabel: i18n.translate(
    'xpack.onechat.tools.mcpHealthBanner.viewMcpServerButtonLabel',
    {
      defaultMessage: 'View MCP server',
    }
  ),
};

interface StatusMessageConfig {
  title: string;
  description: string;
  iconType: string;
}

interface ActionButtonConfig {
  label: string;
  iconType: string;
  onClick?: () => void;
}

const healthStatusMessages: Record<McpUnhealthyStatus, StatusMessageConfig> = {
  [McpHealthStatus.ToolNotFound]: {
    title: mcpHealthI18nMessages.toolNotFound.title,
    description: mcpHealthI18nMessages.toolNotFound.description,
    iconType: 'magnifyWithExclamation',
  },
  [McpHealthStatus.ConnectorNotFound]: {
    title: mcpHealthI18nMessages.connectorNotFound.title,
    description: mcpHealthI18nMessages.connectorNotFound.description,
    iconType: 'unlink',
  },
  [McpHealthStatus.ListToolsFailed]: {
    title: mcpHealthI18nMessages.listToolsFailed.title,
    description: mcpHealthI18nMessages.listToolsFailed.description,
    iconType: 'unlink',
  },
  [McpHealthStatus.ToolUnhealthy]: {
    title: mcpHealthI18nMessages.toolUnhealthy.title,
    description: mcpHealthI18nMessages.toolUnhealthy.description,
    iconType: 'unlink',
  },
};

export interface McpHealthBannerProps {
  status: McpHealthStatus;
  onCreateNewTool?: () => void;
  onDeleteTool?: () => void;
  onViewConnectors?: () => void;
  onViewMcpServer?: () => void;
}

export const McpHealthBanner = ({
  status,
  onCreateNewTool,
  onDeleteTool,
  onViewConnectors,
  onViewMcpServer,
}: McpHealthBannerProps) => {
  const deleteToolButton: ActionButtonConfig = {
    label: mcpHealthI18nMessages.deleteToolButtonLabel,
    iconType: 'trash',
    onClick: onDeleteTool,
  };

  const createNewToolButton: ActionButtonConfig = {
    label: mcpHealthI18nMessages.createNewToolButtonLabel,
    iconType: 'plus',
    onClick: onCreateNewTool,
  };

  const viewConnectorsButton: ActionButtonConfig = {
    label: mcpHealthI18nMessages.viewConnectorsButtonLabel,
    iconType: 'eye',
    onClick: onViewConnectors,
  };

  const viewMcpServerButton: ActionButtonConfig = {
    label: mcpHealthI18nMessages.viewMcpServerButtonLabel,
    iconType: 'eye',
    onClick: onViewMcpServer,
  };

  const healthStatusButtons: Record<McpUnhealthyStatus, ActionButtonConfig[]> = {
    [McpHealthStatus.ToolNotFound]: [deleteToolButton, createNewToolButton],
    [McpHealthStatus.ConnectorNotFound]: [deleteToolButton, viewConnectorsButton],
    [McpHealthStatus.ListToolsFailed]: [viewMcpServerButton],
    [McpHealthStatus.ToolUnhealthy]: [viewMcpServerButton],
  };

  if (status === McpHealthStatus.Healthy) {
    return null;
  }

  const { title, description, iconType } = healthStatusMessages[status];
  const actionButtons = healthStatusButtons[status].filter((button) => button.onClick);

  return (
    <EuiCallOut
      title={title}
      iconType={iconType}
      color="danger"
      css={({ euiTheme }) => css`
        margin-block-end: ${euiTheme.size.l};
      `}
      announceOnMount
    >
      <EuiText size="s">{description}</EuiText>
      {actionButtons.length > 0 && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="s">
            {actionButtons.map((button, index) => (
              <EuiButton
                key={button.label}
                color="danger"
                size="s"
                iconType={button.iconType}
                onClick={button.onClick}
                fill={index === 0}
              >
                {button.label}
              </EuiButton>
            ))}
          </EuiFlexGroup>
        </>
      )}
    </EuiCallOut>
  );
};
