/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import { ToolType } from '@kbn/agent-builder-common';
import React, { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { appPaths } from '../../../../../utils/app_paths';
import { labels } from '../../../../../utils/i18n';
import { McpToolHealthStatus } from '../../types/mcp';
import { useToolHealth } from '../../../../../hooks/tools/use_tools_health';
import { useToolsActions } from '../../../../../context/tools_provider';
import { useGetConnector, useListMcpTools } from '../../../../../hooks/tools/use_mcp_connectors';
import { useNavigation } from '../../../../../hooks/use_navigation';
import { McpHealthBanner } from './mcp_health_banner';
import { useEditMcpServerFlyout } from '../../hooks/use_edit_mcp_server_flyout';
import { i18nMessages } from '../../i18n';
import type { McpConfigurationFieldsProps } from '../../types/mcp';
import type { McpToolFormData } from '../../types/tool_form_types';

export const McpReadOnlyFields = ({
  mcpHealthStatus,
  setMcpHealthStatus,
}: McpConfigurationFieldsProps) => {
  const { createTool, deleteTool } = useToolsActions();
  const { navigateToManageConnectors, navigateToAgentBuilderUrl } = useNavigation();

  const { control, setError, clearErrors } = useFormContext<McpToolFormData>();
  const [connectorId, mcpToolName, toolId] = useWatch({
    control,
    name: ['connectorId', 'mcpToolName', 'toolId'],
  });

  const { toolHealth, isLoading: isLoadingToolHealth } = useToolHealth({ toolId });

  const {
    connector,
    isLoading: isLoadingConnector,
    failureReason: loadingConnectorError,
  } = useGetConnector({
    connectorId,
  });

  const {
    openFlyout: openEditMcpServerFlyout,
    isOpen: isEditMcpServerFlyoutOpen,
    flyout: editMcpServerFlyout,
  } = useEditMcpServerFlyout({ connector });

  const {
    mcpTools,
    isLoading: isLoadingMcpTools,
    failureReason: loadingMcpToolsError,
  } = useListMcpTools({ connectorId });

  useEffect(() => {
    if (isLoadingConnector || isLoadingMcpTools || isLoadingToolHealth) {
      return;
    }

    // MCP connector deleted
    if (loadingConnectorError) {
      setMcpHealthStatus(McpToolHealthStatus.ConnectorNotFound);
      setError('connectorId', {
        message: labels.tools.mcpHealthStatus.connectorNotFound.title,
      });
      return;
    }

    // MCP tools not found
    if (loadingMcpToolsError) {
      setMcpHealthStatus(McpToolHealthStatus.ListToolsFailed);
      setError('connectorId', {
        message: labels.tools.mcpHealthStatus.listToolsFailed.title,
      });
      return;
    }

    // MCP tool not found
    if (!mcpTools.find((tool) => tool.name === mcpToolName)) {
      setMcpHealthStatus(McpToolHealthStatus.ToolNotFound);
      setError('mcpToolName', {
        message: labels.tools.mcpHealthStatus.toolNotFound.title,
      });
      return;
    }

    // MCP tool is unhealthy; treat no health data as healthy
    if (toolHealth && toolHealth.status !== 'healthy') {
      setMcpHealthStatus(McpToolHealthStatus.ToolUnhealthy);
      setError('mcpToolName', {
        message: labels.tools.mcpHealthStatus.toolUnhealthy.title,
      });
      return;
    }

    setMcpHealthStatus(McpToolHealthStatus.Healthy);
    clearErrors(['connectorId', 'mcpToolName']);
  }, [
    mcpToolName,
    mcpTools,
    toolHealth,
    loadingConnectorError,
    loadingMcpToolsError,
    isLoadingConnector,
    isLoadingMcpTools,
    isLoadingToolHealth,
    setMcpHealthStatus,
    setError,
    clearErrors,
  ]);

  return (
    <>
      {mcpHealthStatus && (
        <McpHealthBanner
          status={mcpHealthStatus}
          onDeleteTool={() =>
            deleteTool(toolId, { onConfirm: () => navigateToAgentBuilderUrl(appPaths.tools.list) })
          }
          onCreateNewTool={() => createTool(ToolType.mcp)}
          onViewConnectors={navigateToManageConnectors}
          onViewMcpServer={openEditMcpServerFlyout}
        />
      )}
      <EuiFormRow label={i18nMessages.configuration.form.mcp.connectorLabel}>
        <EuiComboBox
          fullWidth
          singleSelection={{
            asPlainText: true,
          }}
          selectedOptions={connector ? [{ label: connector.name }] : []}
          isLoading={isLoadingConnector}
          isDisabled={true}
        />
      </EuiFormRow>
      <EuiFormRow label={i18nMessages.configuration.form.mcp.mcpToolLabel}>
        <EuiComboBox
          fullWidth
          singleSelection={{
            asPlainText: true,
          }}
          selectedOptions={connector && mcpToolName ? [{ label: mcpToolName }] : []}
          isLoading={isLoadingConnector}
          isDisabled={true}
        />
      </EuiFormRow>
      {isEditMcpServerFlyoutOpen && editMcpServerFlyout}
    </>
  );
};
