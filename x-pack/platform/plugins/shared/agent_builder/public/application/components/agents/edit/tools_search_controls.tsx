/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiSearchBarOnChangeArgs, EuiSearchBarProps, Search } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiSwitch, EuiSearchBar } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { countBy } from 'lodash';
import type { ToolDefinition } from '@kbn/agent-builder-common';
import { labels } from '../../../utils/i18n';
import { FilterOptionWithMatchesBadge } from '../../common/filter_option_with_matches_badge';

interface ToolsSearchControlsProps {
  displayTools: ToolDefinition[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showActiveOnly: boolean;
  onShowActiveOnlyChange?: (showActiveOnly: boolean) => void;
  disabled: boolean;
}

export const ToolsSearchControls: React.FC<ToolsSearchControlsProps> = ({
  displayTools,
  searchQuery,
  onSearchChange,
  showActiveOnly,
  onShowActiveOnlyChange,
  disabled,
}) => {
  const allTags = React.useMemo(() => {
    const tagsSet = new Set<string>();
    displayTools.forEach((tool) => {
      tool.tags.forEach((tag) => tagsSet.add(tag));
    });
    return Array.from(tagsSet);
  }, [displayTools]);

  const searchConfig: Search = React.useMemo(() => {
    const matchesByTag = countBy(displayTools.flatMap((tool) => tool.tags));

    const config: EuiSearchBarProps = {
      box: {
        incremental: true,
        placeholder: labels.tools.searchToolsPlaceholder,
      },
      filters: [
        {
          type: 'field_value_selection',
          field: 'tags',
          name: labels.tools.tagsFilter,
          multiSelect: 'or',
          options: allTags.map((tag) => ({
            value: tag,
            name: tag,
            view: <FilterOptionWithMatchesBadge name={tag} matches={matchesByTag[tag] ?? 0} />,
          })),
          searchThreshold: 1,
          autoSortOptions: false,
        },
      ],
      onChange: ({ queryText, error: searchError }: EuiSearchBarOnChangeArgs) => {
        if (searchError) {
          return;
        }
        onSearchChange(queryText);
      },
      query: searchQuery,
    };

    return config;
  }, [displayTools, allTags, searchQuery, onSearchChange]);

  return (
    <EuiFlexGroup alignItems="center" gutterSize="m">
      {Object.keys(searchConfig).length > 0 && (
        <EuiFlexItem>
          <EuiSearchBar {...(searchConfig as EuiSearchBarProps)} />
        </EuiFlexItem>
      )}
      {onShowActiveOnlyChange && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiSwitch
                label={i18n.translate('xpack.agentBuilder.tools.showActiveOnly', {
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
};
