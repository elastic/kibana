/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiInMemoryTable,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiTitle,
  EuiPanel,
  EuiIcon,
  EuiSpacer,
  EuiCheckbox,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ToolDefinition, ToolType, ToolSelection } from '@kbn/onechat-common';
import type { ToolSelectionRelevantFields } from '@kbn/onechat-common';
import { labels } from '../../../utils/i18n';
import { OnechatToolTags } from '../../tools/tags/tool_tags';
import { truncateAtNewline } from '../../../utils/truncate_at_newline';
import { isToolSelected, isAllToolsSelectedForType } from '../../../utils/tool_selection_utils';
import { toolTypeDisplays } from '../../../utils/constants';

interface ToolsGroupedViewProps {
  toolsByType: Partial<Record<ToolType, ToolDefinition[]>>;
  selectedTools: ToolSelection[];
  onToggleTool: (toolId: string, toolType: ToolType) => void;
  onToggleTypeTools: (type: ToolType) => void;
  disabled: boolean;
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
  onToggleTool: (toolId: string, toolType: ToolType) => void,
  disabled: boolean,
  toolType: ToolType
) => ({
  width: '40px',
  render: (tool: ToolDefinition) => {
    const toolFields: ToolSelectionRelevantFields = {
      id: tool.id,
      type: tool.type,
      tags: tool.tags,
    };
    return (
      <EuiCheckbox
        id={`tool-${tool.id}`}
        checked={isToolSelected(toolFields, selectedTools)}
        onChange={() => onToggleTool(tool.id, toolType)}
        disabled={disabled}
      />
    );
  },
});

const createToolDetailsColumn = () => ({
  name: labels.tools.toolIdLabel,
  render: (item: ToolDefinition) => <ToolDetailsColumn tool={item} />,
});

const createTagsColumn = () => ({
  field: 'tags',
  name: labels.tools.tagsLabel,
  render: (tags: string[]) => <OnechatToolTags tags={tags} />,
});

export const ToolsGroupedView: React.FC<ToolsGroupedViewProps> = ({
  toolsByType,
  selectedTools,
  onToggleTool,
  onToggleTypeTools,
  disabled,
}) => {
  const noItemsMessage = (
    <EuiText component="p" size="s" textAlign="center" color="subdued">
      {i18n.translate('xpack.onechat.tools.noToolsAvailable', {
        defaultMessage: 'No tools available',
      })}
    </EuiText>
  );

  const groupedTableColumns = React.useMemo(
    () => [createToolDetailsColumn(), createTagsColumn()],
    []
  );

  return (
    <>
      {Object.entries(toolsByType).map(([type, typeTools]) => {
        const toolType = type as ToolType;
        const columnsWithToolType = [
          createCheckboxColumn(selectedTools, onToggleTool, disabled, toolType),
          ...groupedTableColumns,
        ];

        return (
          <div key={type}>
            <EuiPanel hasShadow={false} hasBorder={false} paddingSize="m" color="subdued">
              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize="s" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiTitle size="xs">
                        <h4>{toolTypeDisplays[toolType].label}</h4>
                      </EuiTitle>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiIcon type={toolTypeDisplays[toolType].icon} size="l" />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup alignItems="center" gutterSize="s">
                    <EuiFlexItem grow={false}>
                      <EuiSwitch
                        id={`type-${type}`}
                        label={i18n.translate('xpack.onechat.tools.selectAllTypeTools', {
                          defaultMessage: 'Select all',
                        })}
                        checked={isAllToolsSelectedForType(
                          type,
                          typeTools.map((tool) => ({
                            id: tool.id,
                            type: tool.type,
                            tags: tool.tags,
                          })),
                          selectedTools
                        )}
                        onChange={() => onToggleTypeTools(toolType)}
                        disabled={disabled}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>

            <EuiSpacer size="s" />

            <EuiInMemoryTable
              columns={columnsWithToolType}
              items={typeTools}
              itemId="id"
              noItemsMessage={noItemsMessage}
            />

            <EuiSpacer size="m" />
          </div>
        );
      })}
    </>
  );
};
