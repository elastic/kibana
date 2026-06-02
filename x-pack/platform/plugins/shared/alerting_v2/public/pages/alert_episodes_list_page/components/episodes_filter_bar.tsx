/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type SetStateAction,
} from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFilterGroup,
  EuiFieldSearch,
  EuiSuperDatePicker,
  EuiSwitch,
  useEuiTheme,
} from '@elastic/eui';
import type { EpisodesFilterState } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import type { TimeRange } from '@kbn/es-query';
import { AlertEpisodesStatusFilter } from '@kbn/alerting-v2-episodes-ui/components/filters/status_filter';
import { AlertEpisodesRuleFilter } from '@kbn/alerting-v2-episodes-ui/components/filters/rule_filter';
import { AlertEpisodesTagFilter } from '@kbn/alerting-v2-episodes-ui/components/filters/tag_filter';
import { AlertEpisodesAssigneeFilter } from '@kbn/alerting-v2-episodes-ui/components/filters/assignee_filter';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { HttpStart } from '@kbn/core-http-browser';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import useDebounce from 'react-use/lib/useDebounce';
import deepEqual from 'fast-deep-equal';
import { css } from '@emotion/react';
import { INCLUDE_BUILDING_BLOCKS_LABEL } from '../translations';
import { DEFAULT_EPISODES_LIST_FILTER } from '../utils/episodes_list_url_state';
import * as i18n from '../translations';

export interface EpisodesFilterBarProps {
  filterState: EpisodesFilterState;
  onFilterChange: (update: SetStateAction<EpisodesFilterState>) => void;
  timeRange: TimeRange;
  onTimeChange: (range: TimeRange) => void;
  ruleOptions: Array<{ label: string; value: string }>;
  assigneeUids: string[];
  onRefresh?: () => void;
  isLoading?: boolean;
  services: { http: HttpStart; expressions: ExpressionsStart; spaces: SpacesPluginStart };
  includeBuildingBlocks?: boolean;
  onIncludeBuildingBlocksChange?: (value: boolean) => void;
}

export const EpisodesFilterBar = ({
  filterState,
  onFilterChange,
  timeRange,
  onTimeChange,
  ruleOptions,
  assigneeUids,
  onRefresh,
  isLoading = false,
  services,
  includeBuildingBlocks = false,
  onIncludeBuildingBlocksChange,
}: EpisodesFilterBarProps) => {
  const { euiTheme } = useEuiTheme();
  const [queryStringInput, setQueryStringInput] = useState(filterState.queryString ?? '');

  useEffect(() => {
    setQueryStringInput(filterState.queryString ?? '');
  }, [filterState.queryString]);

  useDebounce(
    () => {
      const trimmedValue = queryStringInput.trim() || undefined;
      onFilterChange((prev) =>
        trimmedValue !== prev.queryString ? { ...prev, queryString: trimmedValue } : prev
      );
    },
    300,
    [queryStringInput]
  );

  const onStatusChange = useCallback(
    (status: string | undefined) => {
      onFilterChange((prev) => ({ ...prev, status }));
    },
    [onFilterChange]
  );

  const onRuleChange = useCallback(
    (ruleId: string | undefined) => {
      onFilterChange((prev) => ({ ...prev, ruleId }));
    },
    [onFilterChange]
  );

  const onTagsChange = useCallback(
    (tags: string[] | undefined) => {
      onFilterChange((prev) => ({ ...prev, tags }));
    },
    [onFilterChange]
  );

  const onAssigneeChange = useCallback(
    (assigneeUid: string | undefined) => {
      onFilterChange((prev) => ({ ...prev, assigneeUid }));
    },
    [onFilterChange]
  );

  const onKueryChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setQueryStringInput(e.target.value);
  }, []);

  const hasActiveFilters = useMemo(
    () => !deepEqual(filterState, DEFAULT_EPISODES_LIST_FILTER) || queryStringInput.trim() !== '',
    [filterState, queryStringInput]
  );

  const onClearFilters = useCallback(() => {
    setQueryStringInput('');
    onFilterChange({ ...DEFAULT_EPISODES_LIST_FILTER });
  }, [onFilterChange]);

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" wrap>
      <EuiFlexItem grow>
        <EuiFieldSearch
          fullWidth
          compressed
          placeholder={i18n.EPISODES_FILTER_BAR_SEARCH_PLACEHOLDER}
          value={queryStringInput}
          onChange={onKueryChange}
          data-test-subj="episodesFilterBar-search"
          css={css`
            // When opening the details push flyout the filters bar shrinks, this ensures
            // that the search bar keeps a minimum size for typing ergonomics
            min-width: ${euiTheme.base * 20}px;
          `}
        />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiFilterGroup compressed>
              <AlertEpisodesStatusFilter
                selectedStatus={filterState.status}
                onStatusChange={onStatusChange}
                data-test-subj="episodesFilterBar-status"
              />

              <AlertEpisodesRuleFilter
                selectedRuleId={filterState.ruleId}
                onRuleChange={onRuleChange}
                ruleOptions={ruleOptions}
                data-test-subj="episodesFilterBar-rule"
                services={services}
              />

              <AlertEpisodesTagFilter
                selectedTags={filterState.tags}
                onTagsChange={onTagsChange}
                services={services}
                timeRange={timeRange}
                data-test-subj="episodesFilterBar-tags"
              />

              <AlertEpisodesAssigneeFilter
                selectedAssigneeUid={filterState.assigneeUid}
                onAssigneeChange={onAssigneeChange}
                assigneeUids={assigneeUids}
                data-test-subj="episodesFilterBar-assignee"
              />
            </EuiFilterGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="xs"
          iconType="cross"
          disabled={!hasActiveFilters}
          onClick={onClearFilters}
          data-test-subj="episodesFilterBar-resetFilters"
        >
          {i18n.EPISODES_FILTER_BAR_RESET_FILTERS}
        </EuiButtonEmpty>
      </EuiFlexItem>

      {onIncludeBuildingBlocksChange && (
        <EuiFlexItem grow={false}>
          <EuiSwitch
            compressed
            label={INCLUDE_BUILDING_BLOCKS_LABEL}
            checked={includeBuildingBlocks}
            onChange={(e) => onIncludeBuildingBlocksChange(e.target.checked)}
            data-test-subj="episodesFilterBar-includeBuildingBlocks"
          />
        </EuiFlexItem>
      )}

      <EuiFlexItem grow={false}>
        <EuiSuperDatePicker
          compressed
          start={timeRange.from}
          end={timeRange.to}
          onTimeChange={({ start, end }) => onTimeChange({ from: start, to: end })}
          onRefresh={onRefresh}
          isLoading={isLoading}
          showUpdateButton="iconOnly"
          updateButtonProps={{
            fill: false,
          }}
          width="auto"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
