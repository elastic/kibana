/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiFlexGroup, EuiIconTip } from '@elastic/eui';
import type { ToolDefinition } from '@kbn/agent-builder-common/tools';
import React from 'react';
import { labels } from '../../../utils/i18n';
import { AgentBuilderToolTags } from '../tags/tool_tags';
import { ToolContextMenu } from './tools_table_context_menu';
import { ToolIdWithDescription } from './tools_table_id';
import { ToolQuickActions } from './tools_table_quick_actions';

export const getToolsTableColumns = ({
  canManageTools,
}: {
  canManageTools: boolean;
}): Array<EuiBasicTableColumn<ToolDefinition>> => {
  return [
    // Readonly indicator
    {
      width: '30px',
      render: (tool: ToolDefinition) =>
        tool.readonly ? <EuiIconTip type="lock" content={labels.tools.readOnly} /> : null,
    },
    {
      field: 'id',
      name: labels.tools.toolIdLabel,
      sortable: true,
      width: '60%',
      render: (_, tool: ToolDefinition) => <ToolIdWithDescription tool={tool} />,
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
          {!tool.readonly && canManageTools && <ToolQuickActions tool={tool} />}
          <ToolContextMenu tool={tool} />
        </EuiFlexGroup>
      ),
    },
  ];
};
