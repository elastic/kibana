/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiFlexGroup, EuiIconTip } from '@elastic/eui';
import type { ToolDefinitionWithSchema } from '@kbn/onechat-common/tools';
import { isEsqlTool } from '@kbn/onechat-common/tools';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { labels } from '../../../utils/i18n';
import { OnechatToolTags } from '../tags/tool_tags';
import { ToolContextMenu } from './tools_table_context_menu';
import { ToolIdWithDescription } from './tools_table_id';
import { ToolQuickActions } from './tools_table_quick_actions';

const readonlyTooltip = i18n.translate('xpack.onechat.tools.table.readonlyTooltip', {
  defaultMessage: 'Read-only',
});

export const getToolsTableColumns = (): Array<EuiBasicTableColumn<ToolDefinitionWithSchema>> => {
  return [
    // Readonly indicator
    {
      width: '30px',
      render: (tool: ToolDefinitionWithSchema) =>
        tool.readonly ? <EuiIconTip type="lock" content={readonlyTooltip} /> : null,
    },
    {
      field: 'id',
      name: labels.tools.toolIdLabel,
      sortable: true,
      width: '60%',
      render: (_, tool: ToolDefinitionWithSchema) => <ToolIdWithDescription tool={tool} />,
    },
    {
      field: 'tags',
      name: labels.tools.tagsLabel,
      render: (tags: string[]) => <OnechatToolTags tags={tags} />,
    },
    {
      width: '100px',
      align: 'right',
      render: (tool: ToolDefinitionWithSchema) => (
        <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" alignItems="center">
          {isEsqlTool(tool) && <ToolQuickActions tool={tool} />}
          <ToolContextMenu tool={tool} />
        </EuiFlexGroup>
      ),
    },
  ];
};
