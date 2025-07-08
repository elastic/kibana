/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
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
import type { ToolSelection, ToolDescriptor } from '@kbn/onechat-common';
import { allToolsSelectionWildcard } from '@kbn/onechat-common';
import { truncateAtNewline } from '../../../utils/truncate_at_newline';

interface ToolsSelectionProps {
  tools: ToolDescriptor[];
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
  const toolsByProvider = useMemo(() => {
    const grouped: Record<string, ToolDescriptor[]> = {};
    tools.forEach((tool) => {
      const providerId = tool.meta.providerId;
      if (!grouped[providerId]) {
        grouped[providerId] = [];
      }
      grouped[providerId].push(tool);
    });
    return grouped;
  }, [tools]);

  const isAllToolsSelectedForProvider = (providerId: string) => {
    // Check if there's a wildcard selection for this provider
    const hasWildcardSelection = selectedTools.some(
      (selection) =>
        selection.toolIds.includes(allToolsSelectionWildcard) &&
        (!selection.provider || selection.provider === providerId)
    );

    if (hasWildcardSelection) {
      return true;
    }

    // Otherwise, check if all individual tools are selected
    const providerTools = toolsByProvider[providerId] || [];
    return providerTools.every((tool) =>
      selectedTools.some(
        (selection) =>
          selection.toolIds.includes(tool.id) &&
          (!selection.provider || selection.provider === providerId)
      )
    );
  };

  const isToolSelected = (toolId: string, providerId: string) => {
    return selectedTools.some(
      (selection) =>
        (selection.toolIds.includes(toolId) ||
          selection.toolIds.includes(allToolsSelectionWildcard)) &&
        (!selection.provider || selection.provider === providerId)
    );
  };

  const toggleProviderTools = (providerId: string) => {
    const providerTools = toolsByProvider[providerId] || [];
    const allSelected = isAllToolsSelectedForProvider(providerId);

    if (allSelected) {
      // Remove all tools from this provider (including wildcard selections)
      const newSelection = selectedTools.filter(
        (selection) =>
          !(
            selection.provider === providerId ||
            selection.toolIds.includes(allToolsSelectionWildcard) ||
            selection.toolIds.some((toolId) => providerTools.some((tool) => tool.id === toolId))
          )
      );
      onToolsChange(newSelection);
    } else {
      // Add all tools from this provider using wildcard
      const existingSelection = selectedTools.filter(
        (selection) =>
          !(
            selection.provider === providerId ||
            selection.toolIds.includes(allToolsSelectionWildcard) ||
            selection.toolIds.some((toolId) => providerTools.some((tool) => tool.id === toolId))
          )
      );

      const newProviderSelection: ToolSelection = {
        provider: providerId,
        toolIds: [allToolsSelectionWildcard],
      };

      onToolsChange([...existingSelection, newProviderSelection]);
    }
  };

  const toggleTool = (toolId: string, providerId: string) => {
    const isSelected = isToolSelected(toolId, providerId);
    const providerTools = toolsByProvider[providerId] || [];

    if (isSelected) {
      // Check if this tool is selected via wildcard
      const hasWildcardSelection = selectedTools.some(
        (selection) =>
          selection.toolIds.includes(allToolsSelectionWildcard) &&
          (!selection.provider || selection.provider === providerId)
      );

      if (hasWildcardSelection) {
        // Replace wildcard with individual tool selections (excluding the one being toggled off)
        const newSelection = selectedTools.filter(
          (selection) =>
            !(
              selection.toolIds.includes(allToolsSelectionWildcard) &&
              (!selection.provider || selection.provider === providerId)
            )
        );

        // Add individual selections for all other tools
        const otherToolIds = providerTools
          .filter((tool) => tool.id !== toolId)
          .map((tool) => tool.id);

        if (otherToolIds.length > 0) {
          newSelection.push({
            provider: providerId,
            toolIds: otherToolIds,
          });
        }

        onToolsChange(newSelection);
      } else {
        // Remove from individual selections
        const newSelection = selectedTools
          .map((selection) => {
            if (selection.toolIds.includes(toolId)) {
              const newToolIds = selection.toolIds.filter((id) => id !== toolId);
              return newToolIds.length > 0 ? { ...selection, toolIds: newToolIds } : null;
            }
            return selection;
          })
          .filter(Boolean) as ToolSelection[];

        onToolsChange(newSelection);
      }
    } else {
      const existingSelection = selectedTools.filter(
        (selection) => !selection.toolIds.includes(toolId)
      );

      const newToolSelection: ToolSelection = {
        toolIds: [toolId],
      };

      onToolsChange([...existingSelection, newToolSelection]);
    }
  };

  if (toolsLoading) {
    return <EuiLoadingSpinner size="l" />;
  }

  return (
    <div>
      {Object.entries(toolsByProvider).map(([providerId, providerTools]) => {
        const columns: Array<EuiBasicTableColumn<ToolDescriptor>> = [
          {
            field: 'id',
            name: i18n.translate('xpack.onechat.tools.toolIdLabel', { defaultMessage: 'Tool' }),
            valign: 'top',
            render: (id: string, tool: ToolDescriptor) => (
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiCheckbox
                    id={`tool-${tool.id}`}
                    checked={isToolSelected(tool.id, providerId)}
                    onChange={() => toggleTool(tool.id, providerId)}
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
                  checked={isAllToolsSelectedForProvider(providerId)}
                  onChange={() => toggleProviderTools(providerId)}
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
