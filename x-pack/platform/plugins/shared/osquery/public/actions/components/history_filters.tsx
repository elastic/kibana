/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFilterSelectItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSuperDatePicker,
} from '@elastic/eui';
import type { EuiSuperDatePickerRecentRange } from '@elastic/eui';
import type {
  DurationRange,
  OnRefreshChangeProps,
} from '@elastic/eui/src/components/date_picker/types';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { i18n } from '@kbn/i18n';

import { useKibana } from '../../common/lib/kibana';
import { RunByFilterPopover } from './run_by_filter_popover';
import type { SourceFilter } from '../../../common/api/unified_history/types';

export const DEFAULT_START_DATE = 'now-24h';
export const DEFAULT_END_DATE = 'now';

export interface HistoryFilterValues {
  kuery: string | undefined;
  selectedUserIds: string[];
  sourceFilters: string | undefined;
  startDate: string;
  endDate: string;
}

interface HistoryFiltersProps {
  isFetching: boolean;
  onFiltersChange: (values: HistoryFilterValues) => void;
  onRefresh: () => void;
}

const HistoryFiltersComponent: React.FC<HistoryFiltersProps> = ({
  isFetching,
  onFiltersChange,
  onRefresh,
}) => {
  const { uiSettings } = useKibana().services;

  const [searchValue, setSearchValue] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const [sourceFilters, setSourceFilters] = useState<Set<SourceFilter>>(
    new Set(['live', 'rule', 'scheduled'])
  );
  const [isSourcePopoverOpen, setIsSourcePopoverOpen] = useState(false);

  const [startDate, setStartDate] = useState(DEFAULT_START_DATE);
  const [endDate, setEndDate] = useState(DEFAULT_END_DATE);
  const [recentlyUsedDateRanges, setRecentlyUsedDateRanges] = useState<
    EuiSuperDatePickerRecentRange[]
  >([]);
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(10000);

  const commonlyUsedRanges = useMemo(
    () =>
      uiSettings
        ?.get(UI_SETTINGS.TIMEPICKER_QUICK_RANGES)
        ?.map(({ from, to, display }: { from: string; to: string; display: string }) => ({
          start: from,
          end: to,
          label: display,
        })) ?? [],
    [uiSettings]
  );

  const emitChange = useCallback(
    (overrides: Partial<{ search: string; users: string[]; sources: Set<SourceFilter>; start: string; end: string }>) => {
      const search = overrides.search ?? activeSearchTerm;
      const users = overrides.users ?? selectedUserIds;
      const sources = overrides.sources ?? sourceFilters;
      const start = overrides.start ?? startDate;
      const end = overrides.end ?? endDate;

      onFiltersChange({
        kuery: search || undefined,
        selectedUserIds: users,
        sourceFilters: sources.size === 3 ? undefined : Array.from(sources).join(','),
        startDate: start,
        endDate: end,
      });
    },
    [activeSearchTerm, selectedUserIds, sourceFilters, startDate, endDate, onFiltersChange]
  );

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  }, []);

  const handleSearch = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      setActiveSearchTerm(trimmed);
      emitChange({ search: trimmed });
    },
    [emitChange]
  );

  const handleSelectedUsersChanged = useCallback(
    (userIds: string[]) => {
      setSelectedUserIds(userIds);
      emitChange({ users: userIds });
    },
    [emitChange]
  );

  const toggleSourceFilter = useCallback(
    (filter: SourceFilter) => {
      const next = new Set(sourceFilters);
      if (next.has(filter)) {
        next.delete(filter);
      } else {
        next.add(filter);
      }

      setSourceFilters(next);
      emitChange({ sources: next });
    },
    [sourceFilters, emitChange]
  );

  const toggleLiveFilter = useCallback(() => toggleSourceFilter('live'), [toggleSourceFilter]);
  const toggleRuleFilter = useCallback(() => toggleSourceFilter('rule'), [toggleSourceFilter]);
  const toggleScheduledFilter = useCallback(
    () => toggleSourceFilter('scheduled'),
    [toggleSourceFilter]
  );

  const closeSourcePopover = useCallback(() => setIsSourcePopoverOpen(false), []);
  const toggleSourcePopover = useCallback(() => setIsSourcePopoverOpen((prev) => !prev), []);

  const onTimeChange = useCallback(
    ({ start, end }: DurationRange) => {
      setStartDate(start);
      setEndDate(end);
      setRecentlyUsedDateRanges((prev) => [
        { start, end },
        ...prev.filter((r) => !(r.start === start && r.end === end)).slice(0, 9),
      ]);
      emitChange({ start, end });
    },
    [emitChange]
  );

  const onRefreshChange = useCallback(({ isPaused, refreshInterval }: OnRefreshChangeProps) => {
    setIsAutoRefreshEnabled(!isPaused);
    setAutoRefreshInterval(refreshInterval);
  }, []);

  return (
    <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
      <EuiFlexItem>
        <EuiFieldSearch
          placeholder={i18n.translate('xpack.osquery.unifiedHistory.table.searchPlaceholder', {
            defaultMessage: 'Search by query or pack name',
          })}
          value={searchValue}
          onChange={handleSearchChange}
          onSearch={handleSearch}
          isClearable
          fullWidth
          data-test-subj="unifiedHistorySearch"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFilterGroup>
          <RunByFilterPopover
            selectedUserIds={selectedUserIds}
            onSelectedUsersChanged={handleSelectedUsersChanged}
            enabled
          />
          <EuiPopover
            isOpen={isSourcePopoverOpen}
            closePopover={closeSourcePopover}
            button={
              <EuiFilterButton
                iconType="arrowDown"
                isSelected={isSourcePopoverOpen}
                hasActiveFilters={sourceFilters.size < 3}
                numActiveFilters={sourceFilters.size < 3 ? sourceFilters.size : 0}
                onClick={toggleSourcePopover}
                data-test-subj="sourceFilterButton"
              >
                {i18n.translate('xpack.osquery.unifiedHistory.filter.source', {
                  defaultMessage: 'Source',
                })}
              </EuiFilterButton>
            }
          >
            <EuiFilterSelectItem
              checked={sourceFilters.has('live') ? 'on' : undefined}
              onClick={toggleLiveFilter}
              data-test-subj="sourceFilterLive"
            >
              {i18n.translate('xpack.osquery.unifiedHistory.filter.live', {
                defaultMessage: 'Live',
              })}
            </EuiFilterSelectItem>
            <EuiFilterSelectItem
              checked={sourceFilters.has('rule') ? 'on' : undefined}
              onClick={toggleRuleFilter}
              data-test-subj="sourceFilterRule"
            >
              {i18n.translate('xpack.osquery.unifiedHistory.filter.rule', {
                defaultMessage: 'Rule',
              })}
            </EuiFilterSelectItem>
            <EuiFilterSelectItem
              checked={sourceFilters.has('scheduled') ? 'on' : undefined}
              onClick={toggleScheduledFilter}
              data-test-subj="sourceFilterScheduled"
            >
              {i18n.translate('xpack.osquery.unifiedHistory.filter.scheduled', {
                defaultMessage: 'Scheduled',
              })}
            </EuiFilterSelectItem>
          </EuiPopover>
        </EuiFilterGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiSuperDatePicker
          start={startDate}
          end={endDate}
          onTimeChange={onTimeChange}
          onRefresh={onRefresh}
          onRefreshChange={onRefreshChange}
          isPaused={!isAutoRefreshEnabled}
          refreshInterval={autoRefreshInterval}
          isLoading={isFetching}
          commonlyUsedRanges={commonlyUsedRanges}
          recentlyUsedRanges={recentlyUsedDateRanges}
          dateFormat={uiSettings?.get('dateFormat')}
          width="auto"
          data-test-subj="unifiedHistoryDatePicker"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

HistoryFiltersComponent.displayName = 'HistoryFilters';

export const HistoryFilters = React.memo(HistoryFiltersComponent);
