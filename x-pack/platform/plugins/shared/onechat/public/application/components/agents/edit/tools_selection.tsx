/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import type { EuiSearchBarOnChangeArgs, EuiSearchBarProps, Search } from '@elastic/eui';
import {
  EuiInMemoryTable,
  EuiSearchBar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiText,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTitle,
  EuiPanel,
  EuiCheckbox,
  useEuiTheme,
  EuiIcon,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { countBy } from 'lodash';
import type { ToolSelection, ToolDefinition, ToolType } from '@kbn/onechat-common';
import { ToolType as ToolTypeEnum } from '@kbn/onechat-common';
import {
  toggleTypeSelection,
  toggleToolSelection,
  isToolSelected,
  isAllToolsSelectedForType,
} from '../../../utils/tool_selection_utils';
import { truncateAtNewline } from '../../../utils/truncate_at_newline';
import { labels } from '../../../utils/i18n';
import { ToolFilterOption } from '../../tools/table/tools_table_filter_option';
import { OnechatToolTags } from '../../tools/tags/tool_tags';

interface ToolsSelectionProps {
  tools: ToolDefinition[];
  toolsLoading: boolean;
  selectedTools: ToolSelection[];
  onToolsChange: (tools: ToolSelection[]) => void;
  disabled?: boolean;
  showActiveOnly?: boolean;
  onShowActiveOnlyChange?: (showActiveOnly: boolean) => void;
  enableSearch?: boolean;
  enableFiltering?: boolean;
  enableGrouping?: boolean;
}

const toolTypeDisplays = {
  [ToolTypeEnum.esql]: {
    label: labels.tools.esqlLabel,
    icon: 'code',
  },
  [ToolTypeEnum.builtin]: {
    label: labels.tools.builtinLabel,
    icon: 'logoElastic',
  },
};

export const ToolsSelection: React.FC<ToolsSelectionProps> = ({
  tools,
  toolsLoading,
  selectedTools,
  onToolsChange,
  disabled = false,
  showActiveOnly = false,
  onShowActiveOnlyChange,
  enableSearch = true,
  enableFiltering = true,
  enableGrouping = true,
}) => {
  const { euiTheme } = useEuiTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTools, setFilteredTools] = useState<ToolDefinition[]>(tools);

  // Filter tools based on showActiveOnly and search
  const displayTools = useMemo(() => {
    let result = tools;

    if (showActiveOnly) {
      // Show only selected tools
      result = tools.filter((tool) => isToolSelected(tool, selectedTools));
    }

    return result;
  }, [tools, showActiveOnly, selectedTools]);

  // Update filtered tools when display tools change
  useEffect(() => {
    setFilteredTools(displayTools);
  }, [displayTools]);

  // Group tools by type for enhanced display
  const toolsByType = useMemo(() => {
    const grouped: Partial<Record<ToolType, ToolDefinition[]>> = {};
    filteredTools.forEach((tool) => {
      const toolType = tool.type;
      if (!grouped[toolType]) {
        grouped[toolType] = [];
      }
      grouped[toolType]!.push(tool);
    });
    return grouped;
  }, [filteredTools]);

  // Get unique tags for filtering
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    displayTools.forEach((tool) => {
      tool.tags.forEach((tag) => tagsSet.add(tag));
    });
    return Array.from(tagsSet);
  }, [displayTools]);

  // Prepare search configuration
  const searchConfig: Search = useMemo(() => {
    if (!enableSearch && !enableFiltering) return {};

    const matchesByType = countBy(displayTools, 'type') as Record<ToolType, number>;
    const matchesByTag = countBy(displayTools.flatMap((tool) => tool.tags));

    const config: EuiSearchBarProps = {
      box: enableSearch
        ? {
            incremental: true,
            placeholder: labels.tools.searchToolsPlaceholder,
          }
        : undefined,
      filters: enableFiltering
        ? [
            {
              type: 'field_value_selection',
              field: 'type',
              name: labels.tools.typeFilter,
              multiSelect: false,
              options: [
                {
                  value: ToolTypeEnum.esql,
                  name: labels.tools.esqlLabel,
                  view: (
                    <ToolFilterOption
                      name={labels.tools.esqlLabel}
                      matches={matchesByType[ToolTypeEnum.esql] ?? 0}
                    />
                  ),
                },
                {
                  value: ToolTypeEnum.builtin,
                  name: labels.tools.builtinLabel,
                  view: (
                    <ToolFilterOption
                      name={labels.tools.builtinLabel}
                      matches={matchesByType[ToolTypeEnum.builtin] ?? 0}
                    />
                  ),
                },
              ],
            },
            {
              type: 'field_value_selection',
              field: 'tags',
              name: labels.tools.tagsFilter,
              multiSelect: 'or',
              options: allTags.map((tag) => ({
                value: tag,
                name: tag,
                view: <ToolFilterOption name={tag} matches={matchesByTag[tag] ?? 0} />,
              })),
              searchThreshold: 1,
            },
          ]
        : [],
      onChange: ({ query, queryText, error: searchError }: EuiSearchBarOnChangeArgs) => {
        if (searchError) {
          return;
        }

        const newItems = query
          ? EuiSearchBar.Query.execute(query, displayTools, {
              defaultFields: ['id', 'description', 'type'],
            })
          : displayTools;

        setSearchQuery(queryText);
        setFilteredTools(newItems);
      },
      query: searchQuery,
    };

    return config;
  }, [enableSearch, enableFiltering, displayTools, allTags, searchQuery]);

  // Tool selection handlers (preserve existing logic)
  const handleToggleTypeTools = useCallback(
    (type: ToolType) => {
      const typeTools = toolsByType[type] || [];
      const newSelection = toggleTypeSelection(type, typeTools, selectedTools);
      onToolsChange(newSelection);
    },
    [selectedTools, onToolsChange, toolsByType]
  );

  const handleToggleTool = useCallback(
    (toolId: string, type: ToolType) => {
      const typeTools = toolsByType[type] || [];
      const newSelection = toggleToolSelection(toolId, type, typeTools, selectedTools);
      onToolsChange(newSelection);
    },
    [selectedTools, onToolsChange, toolsByType]
  );

  if (toolsLoading) {
    return <EuiLoadingSpinner size="l" />;
  }

  // Render using EuiInMemoryTable for consistency with tools_table when not grouping
  if (!enableGrouping) {
    const columns = [
      {
        width: '40px',
        render: (tool: ToolDefinition) => (
          <EuiCheckbox
            id={`tool-${tool.id}`}
            checked={isToolSelected(tool, selectedTools)}
            onChange={() => handleToggleTool(tool.id, tool.type)}
            disabled={disabled}
          />
        ),
      },
      {
        field: 'id',
        name: labels.tools.toolIdLabel,
        sortable: true,
        width: '60%',
        render: (_, tool: ToolDefinition) => (
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
        ),
      },
      {
        field: 'type',
        name: labels.tools.typeLabel,
        width: '80px',
        render: (type: string) => <EuiText size="s">{toolTypeDisplays[type].label}</EuiText>,
      },
      {
        field: 'tags',
        name: labels.tools.tagsLabel,
        render: (tags: string[]) => <OnechatToolTags tags={tags} />,
      },
    ];

    return (
      <div>
        {/* Enhanced header with search and filters */}
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem>
            {(enableSearch || enableFiltering) && <EuiSearchBar {...searchConfig} />}
          </EuiFlexItem>
          {onShowActiveOnlyChange && (
            <EuiFlexItem grow={false}>
              <EuiSwitch
                label={<EuiText size="s">Show active only</EuiText>}
                checked={showActiveOnly}
                onChange={(e) => onShowActiveOnlyChange(e.target.checked)}
                disabled={disabled}
                compressed
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>

        <EuiSpacer size="m" />

        <EuiInMemoryTable
          css={css`
            border-top: 1px solid ${euiTheme.colors.borderBaseSubdued};
            table {
              background-color: transparent;
            }
          `}
          columns={columns}
          items={filteredTools}
          itemId="id"
          pagination={{
            pageSize: 10,
            showPerPageOptions: false,
          }}
          sorting={{
            sort: {
              field: 'id',
              direction: 'asc',
            },
          }}
          noItemsMessage={
            <EuiText component="p" size="s" textAlign="center" color="subdued">
              {i18n.translate('xpack.onechat.tools.noToolsAvailable', {
                defaultMessage: 'No tools available',
              })}
            </EuiText>
          }
        />
      </div>
    );
  }

  // Render grouped view (preserve original logic with enhancements)
  return (
    <div>
      {/* Enhanced header with search and filters */}
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem>
          {(enableSearch || enableFiltering) && <EuiSearchBar {...searchConfig} />}
        </EuiFlexItem>
        {onShowActiveOnlyChange && (
          <EuiFlexItem grow={false}>
            <EuiSwitch
              label={<EuiText size="s">Show active only</EuiText>}
              checked={showActiveOnly}
              onChange={(e) => onShowActiveOnlyChange(e.target.checked)}
              disabled={disabled}
              compressed
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {/* Grouped tool display */}
      {Object.entries(toolsByType).map(([type, typeTools]) => {
        const toolType = type as ToolType;
        const columns = [
          {
            width: '40px',
            render: (tool: ToolDefinition) => (
              <EuiCheckbox
                id={`tool-${tool.id}`}
                checked={isToolSelected(tool, selectedTools)}
                onChange={() => handleToggleTool(tool.id, toolType)}
                disabled={disabled}
              />
            ),
          },
          {
            field: 'id',
            name: labels.tools.toolIdLabel,
            render: (_, tool: ToolDefinition) => (
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
            ),
          },
          {
            field: 'tags',
            name: labels.tools.tagsLabel,
            render: (tags: string[]) => <OnechatToolTags tags={tags} />,
          },
        ];

        return (
          <div key={type}>
            <EuiPanel hasShadow={false} hasBorder={false} paddingSize="m" color="subdued">
              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize="s" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiTitle size="xs">
                        <h4>{toolTypeDisplays[type].label}</h4>
                      </EuiTitle>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiIcon type={toolTypeDisplays[type].icon} size="l" />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiSwitch
                    id={`type-${type}`}
                    label={
                      <EuiText size="s" color="subdued">
                        {i18n.translate('xpack.onechat.tools.selectAllTypeTools', {
                          defaultMessage: 'Select all',
                        })}
                      </EuiText>
                    }
                    checked={isAllToolsSelectedForType(type, typeTools, selectedTools)}
                    onChange={() => handleToggleTypeTools(toolType)}
                    disabled={disabled}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>

            <EuiSpacer size="s" />

            <EuiInMemoryTable
              css={css`
                table {
                  background-color: transparent;
                }
              `}
              columns={columns}
              items={typeTools}
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
