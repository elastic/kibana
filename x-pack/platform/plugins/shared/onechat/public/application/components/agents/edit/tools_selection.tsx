/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiCheckbox,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ToolSelection, ToolDefinition } from '@kbn/onechat-common';
import {
  toggleTypeSelection,
  toggleToolSelection,
  isToolSelected,
  isAllToolsSelectedForType,
} from '../../../utils/tool_selection_utils';
import { truncateAtNewline } from '../../../utils/truncate_at_newline';

interface ToolsSelectionProps {
  tools: ToolDefinition[];
  toolsLoading: boolean;
  selectedTools: ToolSelection[];
  onToolsChange: (tools: ToolSelection[]) => void;
  disabled?: boolean;
}

export const ToolsSelection: React.FC<ToolsSelectionProps> = ({
  tools,
  toolsLoading,
  selectedTools,
  onToolsChange,
  disabled = false,
}) => {
  // Group tools by provider
  const toolsByType = useMemo(() => {
    const grouped: Record<string, ToolDefinition[]> = {};
    tools.forEach((tool) => {
      const toolType = tool.type;
      if (!grouped[toolType]) {
        grouped[toolType] = [];
      }
      grouped[toolType].push(tool);
    });
    return grouped;
  }, [tools]);

  const handleToggleTypeTools = useCallback(
    (type: string) => {
      const providerTools = toolsByType[type] || [];
      const newSelection = toggleTypeSelection(type, providerTools, selectedTools);
      onToolsChange(newSelection);
    },
    [selectedTools, onToolsChange, toolsByType]
  );

  const handleToggleTool = useCallback(
    (toolId: string, providerId: string) => {
      const providerTools = toolsByType[providerId] || [];
      const newSelection = toggleToolSelection(toolId, providerId, providerTools, selectedTools);
      onToolsChange(newSelection);
    },
    [selectedTools, onToolsChange, toolsByType]
  );

  if (toolsLoading) {
    return <EuiLoadingSpinner size="l" />;
  }

  return (
    <div>
      {Object.entries(toolsByType).map(([providerId, providerTools]) => {
        const columns: Array<EuiBasicTableColumn<ToolDefinition>> = [
          {
            field: 'id',
            name: i18n.translate('xpack.onechat.tools.toolIdLabel', { defaultMessage: 'Tool' }),
            valign: 'top',
            render: (id: string, tool: ToolDefinition) => (
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiCheckbox
                    id={`tool-${tool.id}`}
                    checked={isToolSelected(tool, selectedTools)}
                    onChange={() => handleToggleTool(tool.id, providerId)}
                    disabled={disabled}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s">
                    <strong>{id}</strong>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            ),
          },
          {
            field: 'description',
            name: i18n.translate('xpack.onechat.tools.toolDescriptionLabel', {
              defaultMessage: 'Description',
            }),
            width: '60%',
            valign: 'top',
            render: (description: string) => (
              <EuiText size="s">{truncateAtNewline(description)}</EuiText>
            ),
          },
        ];

        return (
          <div key={providerId}>
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h4>
                    <EuiCode>{providerId}</EuiCode>{' '}
                    {i18n.translate('xpack.onechat.tools.providerToolsLabel', {
                      defaultMessage: 'tools',
                    })}
                  </h4>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSwitch
                  id={`provider-${providerId}`}
                  label={
                    <EuiText size="s" color="subdued">
                      {i18n.translate('xpack.onechat.tools.selectAllProviderTools', {
                        defaultMessage: 'Select all {providerName} tools',
                        values: { providerName: providerId },
                      })}
                    </EuiText>
                  }
                  checked={isAllToolsSelectedForType(providerId, providerTools, selectedTools)}
                  onChange={() => handleToggleTypeTools(providerId)}
                  disabled={disabled}
                />
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="s" />

            <EuiBasicTable
              columns={columns}
              items={providerTools}
              itemId="id"
              noItemsMessage={i18n.translate('xpack.onechat.tools.noToolsAvailable', {
                defaultMessage: 'No tools available',
              })}
            />

            <EuiSpacer size="m" />
          </div>
        );
      })}
    </div>
  );
};
