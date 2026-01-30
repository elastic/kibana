/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiFlexGroup, EuiIconTip } from '@elastic/eui';
import type { ToolDefinition } from '@kbn/agent-builder-common/tools';
import React, { useMemo } from 'react';
import { useUiPrivileges } from '../../../hooks/use_ui_privileges';
import { labels } from '../../../utils/i18n';
import { AgentBuilderToolTags } from '../tags/tool_tags';
import { ToolContextMenu } from './tools_table_context_menu';
import { ToolIdWithDescription } from './tools_table_id';
import { ToolQuickActions } from './tools_table_quick_actions';
import { useMcpToolsHealth } from '../../../hooks/tools/use_tools_health';
import type { McpToolUnhealthyStatus } from '../form/types/mcp';
import { McpToolHealthStatus, mcpUnhealthyStatusIconMap } from '../form/types/mcp';

const healthStatusMessages: Record<McpToolUnhealthyStatus, { title: string; description: string }> =
  {
    [McpToolHealthStatus.ToolNotFound]: {
      title: labels.tools.mcpHealthStatus.toolNotFound.title,
      description: labels.tools.mcpHealthStatus.toolNotFound.description,
    },
    [McpToolHealthStatus.ConnectorNotFound]: {
      title: labels.tools.mcpHealthStatus.connectorNotFound.title,
      description: labels.tools.mcpHealthStatus.connectorNotFound.description,
    },
    [McpToolHealthStatus.ListToolsFailed]: {
      title: labels.tools.mcpHealthStatus.listToolsFailed.title,
      description: labels.tools.mcpHealthStatus.listToolsFailed.description,
    },
    [McpToolHealthStatus.ToolUnhealthy]: {
      title: labels.tools.mcpHealthStatus.toolUnhealthy.title,
      description: labels.tools.mcpHealthStatus.toolUnhealthy.description,
    },
  };

export const useToolsTableColumns = (): Array<EuiBasicTableColumn<ToolDefinition>> => {
  const { manageTools } = useUiPrivileges();
  const { mcpHealthStates } = useMcpToolsHealth();

  return useMemo(
    () => [
      // Status indicator
      {
        width: '30px',
        render: (tool: ToolDefinition) => {
          if (tool.readonly) {
            return <EuiIconTip type="lock" content={labels.tools.readOnly} />;
          }

          const mcpHealthState = mcpHealthStates.find((state) => state.toolId === tool.id);

          if (!mcpHealthState || mcpHealthState.status === McpToolHealthStatus.Healthy) {
            return null;
          }

          const status = mcpHealthState.status as McpToolUnhealthyStatus;
          return (
            <EuiIconTip
              data-test-subj={`agentBuilderToolHealthBadge-${tool.id}-${status}`}
              type={mcpUnhealthyStatusIconMap[status]}
              color="danger"
              title={healthStatusMessages[status].title}
              content={healthStatusMessages[status].description}
            />
          );
        },
      },
      {
        field: 'id',
        name: labels.tools.toolIdLabel,
        sortable: true,
        width: '60%',
        render: (_: string, tool: ToolDefinition) => <ToolIdWithDescription tool={tool} />,
      },
      {
        field: 'tags',
        name: labels.tools.tagsLabel,
        render: (tags: string[]) => <AgentBuilderToolTags tags={tags} />,
      },
      {
        width: '100px',
        align: 'right',
        render: (tool: ToolDefinition) => (
          <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" alignItems="center">
            {!tool.readonly && manageTools && <ToolQuickActions tool={tool} />}
            <ToolContextMenu tool={tool} />
          </EuiFlexGroup>
        ),
      },
    ],
    [manageTools, mcpHealthStates]
  );
};
