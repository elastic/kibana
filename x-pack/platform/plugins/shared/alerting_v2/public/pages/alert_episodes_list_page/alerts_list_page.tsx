/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
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
import { useService } from '@kbn/core-di-browser';
import {
  EpisodeDataSourceProvider,
  useAdditionalEpisodesDataSource,
} from '@kbn/alerting-v2-episodes-ui/context/episode_data_source_context';
import {
  AlertHostProvider,
  type AlertHostContextValue,
} from '@kbn/alerting-v2-episodes-ui/context/alert_host_context';
import type { EpisodeDataSource } from '@kbn/alerting-v2-episodes-ui/types/episode_data_source';
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
import { RuleSummaryFlyoutContainer } from '../../components/rule/flyouts/rule_summary/rule_summary_flyout_container';
import { useComposeDiscoverFlyout } from '../../hooks/use_compose_discover_flyout';
import { CLASSIC_ALERTS_DATA_SOURCE } from '../../alert_sources';
import { UserCapabilities } from '../../services/user_capabilities';

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

export interface AlertsListPageProps {
  dataSource?: EpisodeDataSource;
}

export const AlertsListPage = ({
  dataSource = CLASSIC_ALERTS_DATA_SOURCE,
}: AlertsListPageProps = {}) => {
  const queryV2Source = useService(UserCapabilities).canRead('alerts');
  return (
    <EpisodeDataSourceProvider dataSource={dataSource} queryV2Source={queryV2Source}>
      <AlertsListPageContent />
    </EpisodeDataSourceProvider>
  );
};

const AlertsListPageContent = () => {
  const services = useKibana<AlertsKibanaServices>().services;
  const { rulesLocators, episodesLocators } = useAlertingLocators();
  const additionalDataSource = useAdditionalEpisodesDataSource();
  const canWriteAlerts = useService(UserCapabilities).canWrite('alerts');
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

  const [ruleIdToView, setRuleIdToView] = useState<string | null>(null);
  const [sourceRuleInfoToView, setSourceRuleInfoToView] = useState<
    { category?: string } | undefined
  >();
  const closeRuleFlyout = useCallback(() => setRuleIdToView(null), []);
  const openRuleFlyout = useCallback((ruleId: string, sourceRuleInfo?: { category?: string }) => {
    setRuleIdToView(ruleId);
    setSourceRuleInfoToView(sourceRuleInfo);
  }, []);
  const {
    flyout: composeFlyout,
    confirmationModal,
    openEditFlyout,
    openCloneFlyout,
  } = useComposeDiscoverFlyout();

  const getRuleDetailsHref = useCallback(
    (ruleId: string, isSourceRule?: boolean): string | undefined => {
      if (isSourceRule) {
        const sourceHref = additionalDataSource?.getRuleDetailsHref?.(ruleId);
        return sourceHref ? services.http.basePath.prepend(sourceHref) : undefined;
      }
      return rulesLocators.getRedirectUrl({ ruleId });
    },
    [rulesLocators, additionalDataSource, services.http.basePath]
  );
  const getEpisodeDetailsHref = useCallback(
    (episodeId: string) => episodesLocators.getRedirectUrl({ episodeId }),
    [episodesLocators]
  );

  const hostValue: AlertHostContextValue = useMemo(
    () => ({
      getRuleDetailsHref,
      getEpisodeDetailsHref,
      openRuleFlyout,
      closeRuleFlyout,
      canWriteAlerts,
    }),
    [getRuleDetailsHref, getEpisodeDetailsHref, openRuleFlyout, closeRuleFlyout, canWriteAlerts]
  );

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

  const content = (
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

  return (
    <AlertHostProvider value={hostValue}>
      {content}
      {ruleIdToView ? (
        <RuleSummaryFlyoutContainer
          ruleId={ruleIdToView}
          sourceRuleInfo={sourceRuleInfoToView}
          cachedRule={rulesCache[ruleIdToView]}
          onClose={closeRuleFlyout}
          onEdit={(rule) => {
            setRuleIdToView(null);
            openEditFlyout(rule);
          }}
          onClone={(rule) => {
            setRuleIdToView(null);
            openCloneFlyout(rule);
          }}
        />
      ) : null}
      {composeFlyout}
      {confirmationModal}
    </AlertHostProvider>
  );
};
