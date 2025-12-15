/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import { ToolType } from '@kbn/onechat-common';
import React, { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useToolHealth } from '../../../../../hooks/tools/use_tools_health';
import { useToolsActions } from '../../../../../context/tools_provider';
import { useGetConnector, useListMcpTools } from '../../../../../hooks/tools/use_mcp_connectors';
import { useNavigation } from '../../../../../hooks/use_navigation';
import { McpHealthBanner } from './mcp_health_banner';
import { useEditMcpServerFlyout } from '../../hooks/use_edit_mcp_server_flyout';
import { i18nMessages } from '../../i18n';
import type { McpConfigurationFieldsProps } from '../../types/mcp';
import { McpHealthStatus } from '../../types/mcp';
import type { McpToolFormData } from '../../types/tool_form_types';

export const McpReadOnlyFields = ({
  mcpHealthStatus,
  setMcpHealthStatus,
}: McpConfigurationFieldsProps) => {
  const { createTool, deleteTool } = useToolsActions();
  const { navigateToManageConnectors } = useNavigation();

  const { control } = useFormContext<McpToolFormData>();
  const [connectorId, mcpToolName, toolId] = useWatch({
    control,
    name: ['connectorId', 'mcpToolName', 'toolId'],
  });

  const { toolHealth } = useToolHealth({ toolId });

  const {
    connector,
    isLoading: isLoadingConnector,
    isError: isLoadingConnectorError,
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
    isError: isLoadingMcpToolsError,
  } = useListMcpTools({ connectorId });

  useEffect(() => {
    if (isLoadingConnector || isLoadingMcpTools) {
      return;
    }

    // MCP connector deleted
    if (isLoadingConnectorError) {
      setMcpHealthStatus(McpHealthStatus.ConnectorNotFound);
      return;
    }

    // MCP tools not found
    if (isLoadingMcpToolsError) {
      setMcpHealthStatus(McpHealthStatus.ListToolsFailed);
      return;
    }

    // MCP tool not found
    if (!mcpTools.find((tool) => tool.name === mcpToolName)) {
      setMcpHealthStatus(McpHealthStatus.ToolNotFound);
      return;
    }

    // MCP tool is unhealthy; treat no health data as healthy
    if (toolHealth && toolHealth.status !== 'healthy') {
      setMcpHealthStatus(McpHealthStatus.ToolUnhealthy);
      return;
    }

    setMcpHealthStatus(McpHealthStatus.Healthy);
  }, [
    mcpToolName,
    mcpTools,
    toolHealth,
    isLoadingConnectorError,
    isLoadingMcpToolsError,
    isLoadingConnector,
    isLoadingMcpTools,
    setMcpHealthStatus,
  ]);

  return (
    <>
      {mcpHealthStatus && (
        <McpHealthBanner
          status={mcpHealthStatus}
          onDeleteTool={() => deleteTool(toolId)}
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
