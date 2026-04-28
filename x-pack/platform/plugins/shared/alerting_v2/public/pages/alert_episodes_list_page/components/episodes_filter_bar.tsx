/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, type ChangeEvent, type SetStateAction } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFilterGroup,
  EuiFieldSearch,
  EuiSuperDatePicker,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EpisodesFilterState } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import type { TimeRange } from '@kbn/es-query';
import { AlertEpisodesStatusFilter } from '@kbn/alerting-v2-episodes-ui/components/filters/status_filter';
import { AlertEpisodesRuleFilter } from '@kbn/alerting-v2-episodes-ui/components/filters/rule_filter';
import { AlertEpisodesTagFilter } from '@kbn/alerting-v2-episodes-ui/components/filters/tag_filter';
import { AlertEpisodesAssigneeFilter } from '@kbn/alerting-v2-episodes-ui/components/filters/assignee_filter';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { HttpStart } from '@kbn/core-http-browser';
import useDebounce from 'react-use/lib/useDebounce';

export interface EpisodesFilterBarProps {
  filterState: EpisodesFilterState;
  onFilterChange: (update: SetStateAction<EpisodesFilterState>) => void;
  timeRange: TimeRange;
  onTimeChange: (range: TimeRange) => void;
  ruleOptions: Array<{ label: string; value: string }>;
  assigneeUids: string[];
  onRefresh?: () => void;
  isLoading?: boolean;
  services: { http: HttpStart; expressions: ExpressionsStart };
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
}: EpisodesFilterBarProps) => {
  const [queryStringInput, setQueryStringInput] = useState(filterState.queryString ?? '');

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

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" wrap={false}>
      <EuiFlexItem grow>
        <EuiFieldSearch
          fullWidth
          compressed
          placeholder={i18n.translate('xpack.alertingV2.episodes.filterBar.searchPlaceholder', {
            defaultMessage: 'Search episodes…',
          })}
          value={queryStringInput}
          onChange={onKueryChange}
          data-test-subj="episodesFilterBar-search"
        />
      </EuiFlexItem>

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
