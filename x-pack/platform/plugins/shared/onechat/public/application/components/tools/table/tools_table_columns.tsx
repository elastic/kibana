/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import type { DisplayToolDefinitionWithSchema, ToolTag } from '@kbn/onechat-common/tools';
import { isEsqlTool } from '@kbn/onechat-common/tools';
import React from 'react';
import { labels } from '../../../utils/i18n';
import { OnechatToolTags } from '../tags/tool_tags';
import { ToolContextMenu } from './tools_table_context_menu';
import { ToolIdWithDescription } from './tools_table_id';
import { ToolQuickActions } from './tools_table_quick_actions';

export const getToolsTableColumns = (): Array<
  EuiBasicTableColumn<DisplayToolDefinitionWithSchema>
> => {
  return [
    {
      field: 'id',
      name: labels.tools.toolIdLabel,
      sortable: true,
      width: '60%',
      render: (_, tool: DisplayToolDefinitionWithSchema) => <ToolIdWithDescription tool={tool} />,
    },
    {
      field: 'tags',
      name: labels.tools.tagsLabel,
      render: (tags: ToolTag[]) => <OnechatToolTags tags={tags} />,
    },
    {
      width: '100px',
      align: 'right',
      render: (tool: DisplayToolDefinitionWithSchema) => (
        <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" alignItems="center">
          {isEsqlTool(tool) && <ToolQuickActions tool={tool} />}
          <ToolContextMenu tool={tool} />
        </EuiFlexGroup>
      ),
    },
  ];
};
