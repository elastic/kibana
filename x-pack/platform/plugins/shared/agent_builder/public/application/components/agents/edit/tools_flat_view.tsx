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
import type { ToolDefinition, ToolSelection } from '@kbn/agent-builder-common';
import type { ToolSelectionRelevantFields } from '@kbn/agent-builder-common';
import { labels } from '../../../utils/i18n';
import { AgentBuilderToolTags } from '../../tools/tags/tool_tags';
import { truncateAtNewline } from '../../../utils/truncate_at_newline';
import { isToolSelected } from '../../../utils/tool_selection_utils';

interface ToolsFlatViewProps {
  tools: ToolDefinition[];
  selectedTools: ToolSelection[];
  onToggleTool: (toolId: string) => void;
  disabled: boolean;
  pageIndex: number;
  onPageChange: (pageIndex: number) => void;
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
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
  render: (tags: string[]) => <AgentBuilderToolTags tags={tags} />,
});

export const ToolsFlatView: React.FC<ToolsFlatViewProps> = ({
  tools,
  selectedTools,
  onToggleTool,
  disabled,
  pageIndex,
  onPageChange,
  pageSize,
  onPageSizeChange,
}) => {
  const columns = React.useMemo(
    () => [
      createCheckboxColumn(selectedTools, onToggleTool, disabled),
      createToolDetailsColumn(),
      createTagsColumn(),
    ],
    [selectedTools, onToggleTool, disabled]
  );

  const handleTableChange = React.useCallback(
    ({ page }: CriteriaWithPagination<ToolDefinition>) => {
      if (page) {
        onPageChange(page.index);
        if (page.size !== pageSize) {
          onPageSizeChange(page.size);
        }
      }
    },
    [onPageChange, onPageSizeChange, pageSize]
  );

  const noItemsMessage = (
    <EuiText component="p" size="s" textAlign="center" color="subdued">
      {i18n.translate('xpack.agentBuilder.tools.noToolsAvailable', {
        defaultMessage: 'No tools available',
      })}
    </EuiText>
  );

  return (
    <>
      <EuiFlexGroup justifyContent="flexStart">
        <EuiText size="xs">
          <FormattedMessage
            id="xpack.agentBuilder.tools.toolsSelectionSummary"
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
          pageSizeOptions: [10, 25, 50, 100],
          showPerPageOptions: true,
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
