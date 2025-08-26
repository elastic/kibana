/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import type {
  EuiSearchBarOnChangeArgs,
  EuiSearchBarProps,
  Search,
  CriteriaWithPagination,
} from '@elastic/eui';
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
import { FormattedMessage } from '@kbn/i18n-react';
import { countBy } from 'lodash';
import type { ToolSelection, ToolDefinition, ToolType } from '@kbn/onechat-common';
import {
  ToolType as ToolTypeEnum,
  filterToolsBySelection,
  activeToolsCountWarningThreshold,
} from '@kbn/onechat-common';
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
import { ActiveToolsStatus } from './active_tools_status';

interface ToolsSelectionProps {
  tools: ToolDefinition[];
  toolsLoading: boolean;
  selectedTools: ToolSelection[];
  onToolsChange: (tools: ToolSelection[]) => void;
  disabled?: boolean;
  showActiveOnly?: boolean;
  onShowActiveOnlyChange?: (showActiveOnly: boolean) => void;
  showGroupedView?: boolean;
  onShowGroupedViewChange?: (showGroupedView: boolean) => void;
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

interface ControlsSectionProps {
  searchConfig: Search;
  showGroupedView: boolean;
  onShowGroupedViewChange?: (showGroupedView: boolean) => void;
  showActiveOnly: boolean;
  onShowActiveOnlyChange?: (showActiveOnly: boolean) => void;
  disabled: boolean;
}

const ControlsSection: React.FC<ControlsSectionProps> = ({
  searchConfig,
  showGroupedView,
  onShowGroupedViewChange,
  showActiveOnly,
  onShowActiveOnlyChange,
  disabled,
}) => (
  <EuiFlexGroup alignItems="center" gutterSize="m">
    {Object.keys(searchConfig).length > 0 && (
      <EuiFlexItem>
        <EuiSearchBar {...(searchConfig as EuiSearchBarProps)} />
      </EuiFlexItem>
    )}
    {onShowGroupedViewChange && (
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiSwitch
              label={i18n.translate('xpack.onechat.tools.groupByType', {
                defaultMessage: 'Group by type',
              })}
              checked={showGroupedView}
              onChange={(e) => onShowGroupedViewChange(e.target.checked)}
              disabled={disabled}
              compressed
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    )}
    {onShowActiveOnlyChange && (
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiSwitch
              label={i18n.translate('xpack.onechat.tools.showActiveOnly', {
                defaultMessage: 'Show active only',
              })}
              checked={showActiveOnly}
              onChange={(e) => onShowActiveOnlyChange(e.target.checked)}
              disabled={disabled}
              compressed
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);

interface PaginationHeaderProps {
  pageIndex: number;
  pageSize: number;
  totalItems: number;
  filteredItems: number;
}

const PaginationHeader: React.FC<PaginationHeaderProps> = ({
  pageIndex,
  pageSize,
  totalItems,
  filteredItems,
}) => {
  return (
    <EuiFlexGroup justifyContent="flexStart">
      <EuiText size="xs">
        <FormattedMessage
          id="xpack.onechat.tools.toolsSelectionSummary"
          defaultMessage="Showing {start}-{end} of {total} {tools}"
          values={{
            start: <strong>{Math.min(pageIndex * pageSize + 1, filteredItems)}</strong>,
            end: <strong>{Math.min((pageIndex + 1) * pageSize, filteredItems)}</strong>,
            total: totalItems,
            tools: <strong>{labels.tools.toolsLabel}</strong>,
          }}
        />
      </EuiText>
    </EuiFlexGroup>
  );
};

const createCheckboxColumn = (
  selectedTools: ToolSelection[],
  onToggleTool: (toolId: string, toolType: ToolType) => void,
  disabled: boolean,
  toolType?: ToolType
) => ({
  width: '40px',
  render: (tool: ToolDefinition) => (
    <EuiCheckbox
      id={`tool-${tool.id}`}
      checked={isToolSelected(tool, selectedTools)}
      onChange={() => onToggleTool(tool.id, toolType || tool.type)}
      disabled={disabled}
    />
  ),
});

const createToolDetailsColumn = (euiTheme: any, includeType: boolean = true) => ({
  field: 'id',
  name: labels.tools.toolIdLabel,
  sortable: includeType,
  width: includeType ? '60%' : undefined,
  render: (_: any, tool: ToolDefinition) => (
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
});

const createTypeColumn = () => ({
  field: 'type',
  name: labels.tools.typeLabel,
  width: '80px',
  render: (type: ToolType) => <EuiText size="s">{toolTypeDisplays[type].label}</EuiText>,
});

const createTagsColumn = () => ({
  field: 'tags',
  name: labels.tools.tagsLabel,
  render: (tags: string[]) => <OnechatToolTags tags={tags} />,
});

export const ToolsSelection: React.FC<ToolsSelectionProps> = ({
  tools,
  toolsLoading,
  selectedTools,
  onToolsChange,
  disabled = false,
  showActiveOnly = false,
  onShowActiveOnlyChange,
  showGroupedView = true,
  onShowGroupedViewChange,
}) => {
  const { euiTheme } = useEuiTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [pageIndex, setPageIndex] = useState(0);

  const pageSize = 10;

  const displayTools = useMemo(() => {
    let result = tools;

    if (showActiveOnly) {
      result = tools.filter((tool) => isToolSelected(tool, selectedTools));
    }

    return result;
  }, [tools, showActiveOnly, selectedTools]);

  const filteredTools = useMemo(() => {
    if (!searchQuery) {
      return displayTools;
    }

    return EuiSearchBar.Query.execute(EuiSearchBar.Query.parse(searchQuery), displayTools, {
      defaultFields: ['id', 'description', 'type'],
    });
  }, [searchQuery, displayTools]);

  useEffect(() => {
    setPageIndex(0);
  }, [filteredTools]);

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

  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    displayTools.forEach((tool) => {
      tool.tags.forEach((tag) => tagsSet.add(tag));
    });
    return Array.from(tagsSet);
  }, [displayTools]);

  const activeToolsCount = useMemo(() => {
    return filterToolsBySelection(tools, selectedTools).length;
  }, [tools, selectedTools]);

  const searchConfig: Search = useMemo(() => {
    const matchesByType = countBy(displayTools, 'type') as Record<ToolType, number>;
    const matchesByTag = countBy(displayTools.flatMap((tool) => tool.tags));

    const config: EuiSearchBarProps = {
      box: {
        incremental: true,
        placeholder: labels.tools.searchToolsPlaceholder,
      },
      filters: [
        {
          type: 'field_value_selection',
          field: 'type',
          name: labels.tools.typeFilter,
          multiSelect: true,
          options: Object.entries(toolTypeDisplays).map(([type, display]) => ({
            value: type as ToolType,
            name: display.label,
            view: (
              <ToolFilterOption
                name={display.label}
                matches={matchesByType[type as ToolType] ?? 0}
              />
            ),
          })),
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
      ],
      onChange: ({ queryText, error: searchError }: EuiSearchBarOnChangeArgs) => {
        if (searchError) {
          return;
        }

        setSearchQuery(queryText);
      },
      query: searchQuery,
    };

    return config;
  }, [displayTools, allTags, searchQuery]);

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

  const handleTableChange = useCallback(
    ({ page: { index } }: CriteriaWithPagination<ToolDefinition>) => {
      setPageIndex(index);
    },
    []
  );

  const flatTableColumns = useMemo(
    () => [
      createCheckboxColumn(selectedTools, handleToggleTool, disabled),
      createToolDetailsColumn(euiTheme, true),
      createTypeColumn(),
      createTagsColumn(),
    ],
    [selectedTools, handleToggleTool, disabled, euiTheme]
  );

  const groupedTableColumns = useMemo(
    () => [
      createCheckboxColumn(selectedTools, handleToggleTool, disabled),
      createToolDetailsColumn(euiTheme, false),
      createTagsColumn(),
    ],
    [selectedTools, handleToggleTool, disabled, euiTheme]
  );

  if (toolsLoading) {
    return <EuiLoadingSpinner size="l" />;
  }

  const noItemsMessage = (
    <EuiText component="p" size="s" textAlign="center" color="subdued">
      {i18n.translate('xpack.onechat.tools.noToolsAvailable', {
        defaultMessage: 'No tools available',
      })}
    </EuiText>
  );

  return (
    <div>
      <ActiveToolsStatus
        activeToolsCount={activeToolsCount}
        warningThreshold={activeToolsCountWarningThreshold}
      />

      <EuiSpacer size="l" />

      <ControlsSection
        searchConfig={searchConfig}
        showGroupedView={showGroupedView}
        onShowGroupedViewChange={onShowGroupedViewChange}
        showActiveOnly={showActiveOnly}
        onShowActiveOnlyChange={onShowActiveOnlyChange}
        disabled={disabled}
      />

      <EuiSpacer size="m" />

      {!showGroupedView ? (
        <>
          <PaginationHeader
            pageIndex={pageIndex}
            pageSize={pageSize}
            totalItems={tools.length}
            filteredItems={filteredTools.length}
          />
          <EuiInMemoryTable
            columns={flatTableColumns}
            items={filteredTools}
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
      ) : (
        Object.entries(toolsByType).map(([type, typeTools]) => {
          const toolType = type as ToolType;
          const columnsWithToolType = groupedTableColumns.map((col, index) =>
            index === 0 // First column is always the checkbox column
              ? createCheckboxColumn(selectedTools, handleToggleTool, disabled, toolType)
              : col
          );

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
                          checked={isAllToolsSelectedForType(type, typeTools, selectedTools)}
                          onChange={() => handleToggleTypeTools(toolType)}
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
        })
      )}
    </div>
  );
};
