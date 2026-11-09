/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  logicalCSS,
  useEuiMinBreakpoint,
  useEuiTheme,
} from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderMenu } from '@kbn/app-header';
import { css } from '@emotion/react';
import deepEqual from 'fast-deep-equal';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useFetchAlertingEpisodesQuery } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_alerting_episodes_query';
import { ALERT_EPISODES_LIST_PAGE_SIZE } from '@kbn/alerting-v2-episodes-ui/constants';
import { useInvalidateEpisodeQueries } from '@kbn/alerting-v2-episodes-ui/hooks/use_invalidate_episode_queries';
import { useAlertingRulesCache } from '@kbn/alerting-v2-episodes-ui/hooks/use_alerting_rules_cache';
import { EpisodesKpis } from '@kbn/alerting-v2-episodes-ui/components/episodes_kpis';
import { EpisodesHistogram } from '@kbn/alerting-v2-episodes-ui/components/episodes_histogram';
import { EpisodesTable } from '@kbn/alerting-v2-episodes-ui/components/episodes_table';
import { useEpisodesTableConfig } from './hooks/use_episodes_table_config';
import { NewAlertingExperienceBanner } from './new_alerting_experience_banner';
import { useAlertingLocators } from '../../application/locator_context';
import type { AlertsKibanaServices } from '../../alerts_kibana_services';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import * as i18n from './translations';
import { EpisodesFilterBar } from './components/episodes_filter_bar';
import { useEpisodesListUrlState } from './hooks/use_episodes_list_url_state';
import { DEFAULT_EPISODES_LIST_FILTER } from './utils/episodes_list_url_state';
import { getQueryFilterState } from './utils/episodes_query_filter';
import { useManageRulesHref } from '../../application/manage_rules_href_context';

/*
 * The table has a fixed height, independent of the KPIs and the histogram above it, so the grid
 * always measures a definite height and virtualizes rows.
 */
const TABLE_HEIGHT = 400;

const getAlertsListMenu = ({ manageRulesHref }: { manageRulesHref: string }): AppHeaderMenu => ({
  primaryActionItem: {
    id: 'manageRules',
    label: i18n.EPISODES_LIST_MANAGE_RULES,
    iconType: 'gear',
    href: manageRulesHref,
    testId: 'alertingV2EpisodesListManageRules',
  },
});

export const AlertsListPage = () => {
  const services = useKibana<AlertsKibanaServices>().services;
  const { rulesLocators } = useAlertingLocators();
  const invalidateEpisodeQueries = useInvalidateEpisodeQueries();
  const { euiTheme } = useEuiTheme();
  const largeMediaQuery = useEuiMinBreakpoint('m');
  const timefilter = services.data.query.timefilter.timefilter;

  useBreadcrumbs('episodes_list');

  const {
    filterState,
    setFilterState,
    timeRange,
    handleTimeChange,
    histogramBreakdownField,
    setHistogramBreakdownField,
  } = useEpisodesListUrlState(timefilter);

  const hasActiveFilters = useMemo(
    () => !deepEqual(filterState, DEFAULT_EPISODES_LIST_FILTER),
    [filterState]
  );
  const queryFilterState = useMemo(() => getQueryFilterState(filterState), [filterState]);

  const handleClearFilters = useCallback(() => {
    setFilterState({ ...DEFAULT_EPISODES_LIST_FILTER });
  }, [setFilterState]);

  const {
    visibleColumns,
    sort: sortState,
    rowHeight,
    columnSettings,
    setVisibleColumns,
    setSort,
    setRowHeight,
    onResize,
  } = useEpisodesTableConfig(services.storage);

  const {
    data: episodesData,
    dataView,
    isLoading,
  } = useFetchAlertingEpisodesQuery({
    pageSize: ALERT_EPISODES_LIST_PAGE_SIZE,
    services,
    filterState: queryFilterState,
    sortState,
    timeRange,
  });

  const ruleIds = useMemo(
    () => [...new Set((episodesData ?? []).map((row) => row['rule.id']))],
    [episodesData]
  );

  const { rulesCache } = useAlertingRulesCache({ ruleIds, services });

  const ruleOptions = useMemo(() => {
    const options = Object.entries(rulesCache).map(([id, rule]) => ({
      label: rule.metadata?.name ?? id,
      value: id,
    }));
    const cachedIds = new Set(Object.keys(rulesCache));
    for (const ep of episodesData ?? []) {
      if (!cachedIds.has(ep['rule.id']) && ep['rule.name']) {
        cachedIds.add(ep['rule.id']);
        options.push({ label: ep['rule.name'], value: ep['rule.id'] });
      }
    }
    return options;
  }, [rulesCache, episodesData]);

  const assigneeUids = useMemo(
    () => [
      ...new Set(
        (episodesData ?? [])
          .map((row) => row.last_assignee_uid)
          .filter((uid): uid is string => uid != null)
      ),
    ],
    [episodesData]
  );

  const renderResetFilters = useCallback(
    () => (
      <EuiButtonEmpty
        size="xs"
        iconType="eraser"
        color="text"
        disabled={!hasActiveFilters}
        onClick={handleClearFilters}
        data-test-subj="episodesFilterBar-resetFilters"
      >
        {i18n.EPISODES_FILTER_BAR_RESET_FILTERS}
      </EuiButtonEmpty>
    ),
    [hasActiveFilters, handleClearFilters]
  );

  const locatorHref = rulesLocators.useUrl({});
  const manageRulesHrefOverride = useManageRulesHref();
  const manageRulesHref = manageRulesHrefOverride ?? locatorHref;

  const alertsMenu = useMemo(() => getAlertsListMenu({ manageRulesHref }), [manageRulesHref]);

  return (
    <div
      data-test-subj="alertingV2AlertsListPage"
      css={css`
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        ${logicalCSS('min-height')}: 0;
        min-width: 0;
        ${largeMediaQuery} {
          block-size: calc(
            var(--kbn-application--content-height, 100vh) - ${euiTheme.size.base} * 2
          );
        }
      `}
    >
      <AppHeader
        sticky={false}
        title={i18n.EPISODES_LIST_PAGE_TITLE}
        spacing="bleed"
        menu={alertsMenu}
        docLink={services.docLinks.links.alerting.viewAndManageAlerts}
      />
      <EuiSpacer size="m" />
      <NewAlertingExperienceBanner />

      <EuiFlexGroup
        direction="column"
        css={css`
          flex: 1;
          min-width: 0;
          ${logicalCSS('min-height')}: 0;
          overflow-y: auto;
        `}
      >
        <EuiFlexItem grow={false}>
          <EpisodesFilterBar
            filterState={filterState}
            onFilterChange={setFilterState}
            timeRange={timeRange}
            onTimeChange={handleTimeChange}
            ruleOptions={ruleOptions}
            assigneeUids={assigneeUids}
            onRefresh={invalidateEpisodeQueries}
            isLoading={isLoading}
            services={services}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EpisodesKpis services={services} filterState={queryFilterState} timeRange={timeRange} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EpisodesHistogram
            services={services}
            dataView={dataView}
            filterState={queryFilterState}
            timeRange={timeRange}
            onTimeRangeChange={handleTimeChange}
            breakdownField={histogramBreakdownField}
            onBreakdownFieldChange={setHistogramBreakdownField}
          />
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
          css={css`
            min-width: 0;
            flex-shrink: 0;
            ${logicalCSS('height', `${TABLE_HEIGHT}px`)}
          `}
        >
          <EuiFlexGroup
            direction="column"
            gutterSize="xs"
            responsive={false}
            css={css`
              flex-grow: 1;
              ${logicalCSS('min-height')}: 0;
            `}
          >
            <EuiFlexItem
              grow
              css={css`
                min-width: 0;
                ${logicalCSS('min-height')}: 0;
              `}
            >
              <EpisodesTable
                services={services}
                filterState={queryFilterState}
                timeRange={timeRange}
                visibleColumns={visibleColumns}
                onVisibleColumnsChange={setVisibleColumns}
                sort={sortState}
                onSortChange={setSort}
                rowHeight={rowHeight}
                onRowHeightChange={setRowHeight}
                columnSettings={columnSettings}
                onColumnResize={onResize}
                renderAdditionalToolbarControls={renderResetFilters}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
