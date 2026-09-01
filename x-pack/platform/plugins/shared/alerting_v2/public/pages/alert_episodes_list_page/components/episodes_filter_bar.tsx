/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type SetStateAction,
} from 'react';
import {
  EuiFilterGroup,
  EuiFieldSearch,
  euiContainerCSS,
  euiContainerQuery,
  useEuiContainerQuery,
  useEuiTheme,
} from '@elastic/eui';
import type { EpisodesFilterState } from '@kbn/alerting-v2-common-queries';
import type { TimeRange } from '@kbn/es-query';
import { AlertEpisodesStatusFilter } from '@kbn/alerting-v2-episodes-ui/components/filters/status_filter';
import { AlertEpisodesSeverityFilter } from '@kbn/alerting-v2-episodes-ui/components/filters/severity_filter';
import { AlertEpisodesRuleFilter } from '@kbn/alerting-v2-episodes-ui/components/filters/rule_filter';
import { AlertEpisodesTagFilter } from '@kbn/alerting-v2-episodes-ui/components/filters/tag_filter';
import { AlertEpisodesAssigneeFilter } from '@kbn/alerting-v2-episodes-ui/components/filters/assignee_filter';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { HttpStart } from '@kbn/core-http-browser';
import type {
  ApplicationStart,
  FeatureFlagsStart,
  IUiSettingsClient,
  NotificationsStart,
} from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { AlertingDateRangePicker } from '@kbn/alerting-v2-browser-shared';
import useDebounce from 'react-use/lib/useDebounce';
import { css } from '@emotion/react';
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
  services: {
    http: HttpStart;
    expressions: ExpressionsStart;
    spaces: SpacesPluginStart;
    data: DataPublicPluginStart;
    notifications: NotificationsStart;
    application: ApplicationStart;
    uiSettings: IUiSettingsClient;
    featureFlags: FeatureFlagsStart;
  };
}

const filterBarContainerCss = euiContainerCSS('inline-size');

const searchCss = css`
  grid-area: search;
  min-width: 0;
`;

const filtersCss = css`
  grid-area: filters;
  min-width: 0;
`;

const timePickerCss = css`
  grid-area: time;
`;

const filterGroupCss = css`
  width: 100%;
  max-width: 100%;
`;

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
  const { euiTheme } = useEuiTheme();
  const { ref: filterBarRef, matches: isNarrowContainer } = useEuiContainerQuery<HTMLDivElement>(
    `(width < ${euiTheme.breakpoint.s}px)`
  );
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

  const onStatusesChange = useCallback(
    (status: string[] | undefined) => {
      onFilterChange((prev) => ({ ...prev, status }));
    },
    [onFilterChange]
  );

  const onSeveritiesChange = useCallback(
    (severity: string[] | undefined) => {
      onFilterChange((prev) => ({ ...prev, severity }));
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
    <section
      role="search"
      aria-label={i18n.EPISODES_FILTER_BAR_SEARCH_ARIA_LABEL}
      css={filterBarContainerCss}
    >
      <div
        ref={filterBarRef}
        css={css`
          display: grid;
          grid-template-areas: 'search filters time';
          grid-template-columns: minmax(min(${euiTheme.base * 15}px, 100%), 1fr) auto auto;
          align-items: center;
          gap: ${euiTheme.size.s};

          ${euiContainerQuery(`(width < ${euiTheme.breakpoint.xl}px)`)} {
            grid-template-areas:
              'search time'
              'filters filters';
            grid-template-columns: ${isNarrowContainer
                ? 'minmax(0, 1fr)'
                : `minmax(min(${euiTheme.base * 15}px, 100%), 1fr)`} auto;
          }
        `}
      >
        <div css={searchCss}>
          <EuiFieldSearch
            fullWidth
            compressed
            placeholder={i18n.EPISODES_FILTER_BAR_SEARCH_PLACEHOLDER}
            value={queryStringInput}
            onChange={onKueryChange}
            data-test-subj="episodesFilterBar-search"
          />
        </div>
        <div css={filtersCss}>
          <EuiFilterGroup
            compressed
            css={[
              filterGroupCss,
              css`
                ${euiContainerQuery(`(width < ${euiTheme.breakpoint.xl}px)`)} {
                  display: grid;
                  grid-template-columns: repeat(
                    auto-fit,
                    minmax(min(${euiTheme.base * 8}px, 100%), 1fr)
                  );
                }
              `,
            ]}
          >
            <AlertEpisodesStatusFilter
              selectedStatuses={filterState.status}
              onStatusesChange={onStatusesChange}
              data-test-subj="episodesFilterBar-status"
            />

            <AlertEpisodesSeverityFilter
              selectedSeverities={filterState.severity}
              onSeveritiesChange={onSeveritiesChange}
              data-test-subj="episodesFilterBar-severity"
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
        </div>
        <div css={timePickerCss}>
          <AlertingDateRangePicker
            from={timeRange.from}
            to={timeRange.to}
            onChange={onTimeChange}
            services={services}
            onRefresh={onRefresh}
            isLoading={isLoading}
            showTimeWindowButtons={!isNarrowContainer}
            width="auto"
            collapsed={isNarrowContainer}
            data-test-subj="episodesFilterBar-datePicker"
          />
        </div>
      </div>
    </section>
  );
};
