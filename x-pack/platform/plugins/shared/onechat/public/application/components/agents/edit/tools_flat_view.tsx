/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CriteriaWithPagination } from '@elastic/eui';
import { EuiInMemoryTable, EuiText, EuiFlexGroup, EuiCheckbox } from '@elastic/eui';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ToolDefinition, ToolSelection } from '@kbn/onechat-common';
import type { ToolSelectionRelevantFields } from '@kbn/onechat-common';
import { labels } from '../../../utils/i18n';
import { OnechatToolTags } from '../../tools/tags/tool_tags';
import { truncateAtNewline } from '../../../utils/truncate_at_newline';
import { isToolSelected } from '../../../utils/tool_selection_utils';
import { OAuthConnectionStatus } from './oauth_connection_status';

interface ToolsFlatViewProps {
  tools: ToolDefinition[];
  selectedTools: ToolSelection[];
  onToggleTool: (toolId: string) => void;
  disabled: boolean;
  pageIndex: number;
  onPageChange: (pageIndex: number) => void;
}

interface ToolDetailsColumnProps {
  tool: ToolDefinition;
}

const ToolDetailsColumn: React.FC<ToolDetailsColumnProps> = ({ tool }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiText
        size="s"
        css={css`
          font-weight: ${euiTheme.font.weight.semiBold};
        `}
      >
        {tool.id}
      </EuiText>
      <EuiText size="s" color="subdued">
        {truncateAtNewline(tool.description)}
      </EuiText>
    </EuiFlexGroup>
  );
};

const createCheckboxColumn = (
  selectedTools: ToolSelection[],
  onToggleTool: (toolId: string) => void,
  disabled: boolean
) => ({
  width: '40px',
  render: (tool: ToolDefinition) => {
    const toolFields: ToolSelectionRelevantFields = {
      id: tool.id,
    };
    return (
      <EuiCheckbox
        id={`tool-${tool.id}`}
        checked={isToolSelected(toolFields, selectedTools)}
        onChange={() => onToggleTool(tool.id)}
        disabled={disabled}
      />
    );
  },
});

const createToolDetailsColumn = () => ({
  name: labels.tools.toolIdLabel,
  sortable: (item: ToolDefinition) => item.id,
  width: '60%',
  render: (item: ToolDefinition) => <ToolDetailsColumn tool={item} />,
});

const createTagsColumn = () => ({
  field: 'tags',
  name: labels.tools.tagsLabel,
  render: (tags: string[]) => <OnechatToolTags tags={tags} />,
});

/**
 * Check if a tool is an MCP tool that requires OAuth
 * MCP tools have format: mcp.{serverId}.{toolName}
 * OAuth is required if the tool has provider metadata indicating OAuth
 */
const isOAuthMcpTool = (tool: ToolDefinition): boolean => {
  // Check if it's an MCP tool
  if (tool.type !== 'mcp' || !tool.id.startsWith('mcp.')) {
    return false;
  }

  // Check if provider indicates OAuth requirement
  // TODO: This should check actual server config to determine if OAuth is required
  // For now, we'll assume all MCP tools might need OAuth and show status
  return tool.provider?.type === 'mcp';
};

const createOAuthStatusColumn = () => ({
  name: i18n.translate('xpack.onechat.tools.oauthStatusLabel', {
    defaultMessage: 'Connection',
  }),
  width: '150px',
  render: (tool: ToolDefinition) => {
    if (!isOAuthMcpTool(tool)) {
      return null;
    }

    // Extract server ID from tool ID (format: mcp.{serverId}.{toolName})
    const parts = tool.id.split('.');
    if (parts.length < 3) {
      return null;
    }

    const serverId = parts[1];
    const serverName = tool.provider?.name || serverId;

    return (
      <OAuthConnectionStatus
        mcpServerId={serverId}
        serverName={serverName}
        compact={true}
      />
    );
  },
});

export const ToolsFlatView: React.FC<ToolsFlatViewProps> = ({
  tools,
  selectedTools,
  onToggleTool,
  disabled,
  pageIndex,
  onPageChange,
}) => {
  const pageSize = 10;

  const columns = React.useMemo(
    () => [
      createCheckboxColumn(selectedTools, onToggleTool, disabled),
      createToolDetailsColumn(),
      createTagsColumn(),
      createOAuthStatusColumn(),
    ],
    [selectedTools, onToggleTool, disabled]
  );

  const handleTableChange = React.useCallback(
    ({ page: { index } }: CriteriaWithPagination<ToolDefinition>) => {
      onPageChange(index);
    },
    [onPageChange]
  );

  const noItemsMessage = (
    <EuiText component="p" size="s" textAlign="center" color="subdued">
      {i18n.translate('xpack.onechat.tools.noToolsAvailable', {
        defaultMessage: 'No tools available',
      })}
    </EuiText>
  );

  return (
    <>
      <EuiFlexGroup justifyContent="flexStart">
        <EuiText size="xs">
          <FormattedMessage
            id="xpack.onechat.tools.toolsSelectionSummary"
            defaultMessage="Showing {start}-{end} of {total} {tools}"
            values={{
              start: <strong>{Math.min(pageIndex * pageSize + 1, tools.length)}</strong>,
              end: <strong>{Math.min((pageIndex + 1) * pageSize, tools.length)}</strong>,
              total: tools.length,
              tools: <strong>{labels.tools.toolsLabel}</strong>,
            }}
          />
        </EuiText>
      </EuiFlexGroup>

      <EuiInMemoryTable
        columns={columns}
        items={tools}
        itemId="id"
        pagination={{
          pageIndex,
          pageSize,
          showPerPageOptions: false,
        }}
        onTableChange={handleTableChange}
        sorting={{
          sort: {
            field: 'id',
            direction: 'asc',
          },
        }}
        noItemsMessage={noItemsMessage}
      />
    </>
  );
};
