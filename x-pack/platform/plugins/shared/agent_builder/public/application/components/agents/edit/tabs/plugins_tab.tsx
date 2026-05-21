/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState } from 'react';
import type { CriteriaWithPagination } from '@elastic/eui';
import {
  EuiBadge,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiInMemoryTable,
  EuiLink,
  EuiLoadingSpinner,
  EuiPanel,
  EuiProgress,
  EuiSearchBar,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { PluginDefinition } from '@kbn/agent-builder-common';
import { Controller } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AgentFormData } from '../agent_form';
import { useNavigation } from '../../../../hooks/use_navigation';
import { appPaths } from '../../../../utils/app_paths';
import { labels } from '../../../../utils/i18n';

interface PluginsTabProps {
  control: Control<AgentFormData>;
  plugins: PluginDefinition[];
  isLoading: boolean;
  isFormDisabled: boolean;
  areElasticCapabilitiesEnabled: boolean;
}

export const PluginsTab: React.FC<PluginsTabProps> = ({
  control,
  plugins,
  isLoading,
  isFormDisabled,
  areElasticCapabilitiesEnabled,
}) => {
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const showActiveOnlyChangeHandler = !isFormDisabled ? setShowActiveOnly : undefined;

  return (
    <>
      <EuiSpacer size="l" />
      <Controller
        name="configuration.plugin_ids"
        control={control}
        render={({ field }) => (
          <PluginsSelection
            plugins={plugins}
            pluginsLoading={isLoading}
            selectedPlugins={field.value}
            onPluginsChange={field.onChange}
            disabled={isFormDisabled}
            showActiveOnly={showActiveOnly || isFormDisabled}
            onShowActiveOnlyChange={showActiveOnlyChangeHandler}
            areElasticCapabilitiesEnabled={areElasticCapabilitiesEnabled}
          />
        )}
      />
    </>
  );
};

interface PluginsSelectionProps {
  plugins: PluginDefinition[];
  pluginsLoading: boolean;
  selectedPlugins: string[] | undefined;
  onPluginsChange: (plugins: string[]) => void;
  disabled?: boolean;
  showActiveOnly: boolean;
  onShowActiveOnlyChange?: (showActiveOnly: boolean) => void;
  areElasticCapabilitiesEnabled: boolean;
}

const PluginsSelection: React.FC<PluginsSelectionProps> = ({
  plugins,
  pluginsLoading,
  selectedPlugins,
  onPluginsChange,
  disabled = false,
  showActiveOnly,
  onShowActiveOnlyChange,
  areElasticCapabilitiesEnabled,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const selectedIdSet = useMemo(() => new Set(selectedPlugins ?? []), [selectedPlugins]);

  const isPluginAutoIncluded = useCallback(
    (plugin: PluginDefinition) => areElasticCapabilitiesEnabled && plugin.readonly,
    [areElasticCapabilitiesEnabled]
  );

  const isPluginActive = useCallback(
    (plugin: PluginDefinition) => selectedIdSet.has(plugin.id) || isPluginAutoIncluded(plugin),
    [selectedIdSet, isPluginAutoIncluded]
  );

  const displayPlugins = useMemo(() => {
    if (showActiveOnly) {
      return plugins.filter((plugin) => isPluginActive(plugin));
    }
    return plugins;
  }, [plugins, showActiveOnly, isPluginActive]);

  const filteredPlugins = useMemo(() => {
    if (!searchQuery) {
      return displayPlugins;
    }

    return EuiSearchBar.Query.execute(EuiSearchBar.Query.parse(searchQuery), displayPlugins, {
      defaultFields: ['id', 'name', 'description'],
    });
  }, [searchQuery, displayPlugins]);

  const activePluginsCount = useMemo(() => {
    return plugins.filter((plugin) => isPluginActive(plugin)).length;
  }, [plugins, isPluginActive]);

  const handleTogglePlugin = useCallback(
    (pluginId: string) => {
      const plugin = plugins.find((p) => p.id === pluginId);
      if (plugin && isPluginAutoIncluded(plugin)) return;
      const currentIds = selectedPlugins ?? [];
      if (currentIds.includes(pluginId)) {
        onPluginsChange(currentIds.filter((id) => id !== pluginId));
      } else {
        onPluginsChange([...currentIds, pluginId]);
      }
    },
    [selectedPlugins, onPluginsChange, plugins, isPluginAutoIncluded]
  );

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setPageIndex(0);
  }, []);

  const handleTableChange = useCallback(
    ({ page }: CriteriaWithPagination<PluginDefinition>) => {
      if (page) {
        setPageIndex(page.index);
        if (page.size !== pageSize) {
          setPageSize(page.size);
          setPageIndex(0);
        }
      }
    },
    [pageSize]
  );

  if (pluginsLoading) {
    return <EuiLoadingSpinner size="l" />;
  }

  const columns = [
    createCheckboxColumn(isPluginActive, isPluginAutoIncluded, handleTogglePlugin, disabled),
    createPluginDetailsColumn(),
    createVersionColumn(),
  ];

  return (
    <div>
      <ActivePluginsStatus activePluginsCount={activePluginsCount} totalPlugins={plugins.length} />

      <EuiSpacer size="l" />

      <EuiFlexGroup alignItems="center" gutterSize="m">
        <EuiFlexItem>
          <EuiSearchBar
            box={{
              incremental: true,
              placeholder: labels.plugins.searchPluginsPlaceholder,
            }}
            onChange={({ queryText, error }) => {
              if (!error) {
                handleSearchChange(queryText);
              }
            }}
            query={searchQuery}
          />
        </EuiFlexItem>
        {onShowActiveOnlyChange && (
          <EuiFlexItem grow={false}>
            <EuiSwitch
              label={i18n.translate('xpack.agentBuilder.plugins.showActiveOnly', {
                defaultMessage: 'Show active only',
              })}
              checked={showActiveOnly}
              onChange={(e) => onShowActiveOnlyChange(e.target.checked)}
              disabled={disabled}
              compressed
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiFlexGroup justifyContent="flexStart">
        <EuiText size="xs">
          <FormattedMessage
            id="xpack.agentBuilder.plugins.pluginsSelectionSummary"
            defaultMessage="Showing {start}-{end} of {total} {plugins}"
            values={{
              start: <strong>{Math.min(pageIndex * pageSize + 1, filteredPlugins.length)}</strong>,
              end: <strong>{Math.min((pageIndex + 1) * pageSize, filteredPlugins.length)}</strong>,
              total: filteredPlugins.length,
              plugins: <strong>{labels.plugins.title}</strong>,
            }}
          />
        </EuiText>
      </EuiFlexGroup>

      <EuiInMemoryTable
        columns={columns}
        items={filteredPlugins}
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
            field: 'name',
            direction: 'asc',
          },
        }}
        noItemsMessage={
          plugins.length > 0
            ? labels.plugins.noPluginsMatchMessage
            : labels.plugins.noPluginsMessage
        }
      />
    </div>
  );
};

const ActivePluginsStatus: React.FC<{ activePluginsCount: number; totalPlugins: number }> = ({
  activePluginsCount,
  totalPlugins,
}) => {
  const { createAgentBuilderUrl } = useNavigation();
  const isZeroPlugins = activePluginsCount === 0;
  const statusColor = isZeroPlugins ? 'warning' : 'success';
  const iconType = isZeroPlugins ? 'alert' : 'checkCircleFill';

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
      <EuiFlexGroup alignItems="center" gutterSize="l">
        <EuiFlexItem grow={1}>
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type={iconType} color={statusColor} size="m" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="m" color={statusColor}>
                    <strong>
                      {i18n.translate('xpack.agentBuilder.activePluginsStatus.title', {
                        defaultMessage:
                          'This agent has {count} active {count, plural, one {plugin} other {plugins}}',
                        values: { count: activePluginsCount },
                      })}
                    </strong>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s" color="subdued">
                <FormattedMessage
                  id="xpack.agentBuilder.activePluginsStatus.description"
                  defaultMessage="{pluginsLink} extend agents with additional skills and capabilities."
                  values={{
                    pluginsLink: (
                      <EuiLink href={createAgentBuilderUrl(appPaths.plugins.list)}>
                        {labels.plugins.title}
                      </EuiLink>
                    ),
                  }}
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={1}>
          <EuiProgress
            value={activePluginsCount}
            max={totalPlugins}
            color={statusColor}
            size="m"
            label={i18n.translate('xpack.agentBuilder.activePluginsStatus.progressLabel', {
              defaultMessage: 'Active plugins',
            })}
            valueText={`${activePluginsCount}/${totalPlugins}`}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const PluginDetailsColumn: React.FC<{ plugin: PluginDefinition }> = ({ plugin }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiText
        size="s"
        css={css`
          font-weight: ${euiTheme.font.weight.semiBold};
        `}
      >
        {plugin.name}
      </EuiText>
      <EuiText size="s" color="subdued">
        {plugin.description}
      </EuiText>
    </EuiFlexGroup>
  );
};

const createCheckboxColumn = (
  isPluginActive: (plugin: PluginDefinition) => boolean,
  isPluginAutoIncluded: (plugin: PluginDefinition) => boolean,
  onToggle: (pluginId: string) => void,
  disabled: boolean
) => ({
  width: '40px',
  render: (plugin: PluginDefinition) => {
    const autoIncluded = isPluginAutoIncluded(plugin);
    const checkbox = (
      <EuiCheckbox
        id={`plugin-${plugin.id}`}
        checked={isPluginActive(plugin)}
        onChange={() => onToggle(plugin.id)}
        disabled={disabled || autoIncluded}
      />
    );
    return autoIncluded ? (
      <EuiToolTip content={labels.agentPlugins.autoPluginManagedTooltip}>{checkbox}</EuiToolTip>
    ) : (
      checkbox
    );
  },
});

const createPluginDetailsColumn = () => ({
  name: i18n.translate('xpack.agentBuilder.plugins.pluginNameLabel', {
    defaultMessage: 'Plugin',
  }),
  sortable: (item: PluginDefinition) => item.name,
  width: '70%',
  render: (item: PluginDefinition) => <PluginDetailsColumn plugin={item} />,
});

const createVersionColumn = () => ({
  field: 'version',
  name: labels.plugins.versionLabel,
  render: (version: string) => <EuiBadge color="hollow">{version}</EuiBadge>,
});
