/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTableColumn, EuiFlexGroup, EuiText } from '@elastic/eui';
import { ToolDefinitionWithSchema, ToolType, isEsqlTool } from '@kbn/onechat-common/tools';
import React from 'react';
import { labels } from '../../../utils/i18n';
import { OnechatToolTags } from '../tags/tool_tags';
import { ToolContextMenu } from './tools_table_context_menu';
import { ToolIdWithDescription } from './tools_table_id';
import { ToolQuickActions } from './tools_table_quick_actions';

export const getToolsTableColumns = (): Array<EuiBasicTableColumn<ToolDefinitionWithSchema>> => {
  return [
    {
      field: 'id',
      name: labels.tools.toolIdLabel,
      sortable: true,
      width: '60%',
      render: (_, tool: ToolDefinitionWithSchema) => <ToolIdWithDescription tool={tool} />,
    },
    {
      field: 'type',
      name: labels.tools.typeLabel,
      width: '80px',
      render: (type: string) =>
        type === ToolType.esql ? (
          <EuiText size="s">{labels.tools.esqlLabel}</EuiText>
        ) : type === ToolType.builtin ? (
          <EuiText size="s">{labels.tools.builtinLabel}</EuiText>
        ) : null,
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
