/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback, useMemo, useState } from 'react';
import type { EuiDataGridColumn, EuiThemeComputed } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  logicalCSS,
  useEuiMinBreakpoint,
  useEuiTheme,
} from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderMenu } from '@kbn/app-header';
import { CellActionsProvider } from '@kbn/cell-actions';
import type { RenderDocumentViewCallback, SortOrder } from '@kbn/unified-data-table';
import {
  DataLoadingState,
  UnifiedDataTable,
  getRenderCustomToolbarWithElements,
  type CustomCellRenderer,
  type CustomGridColumnsConfiguration,
  type UnifiedDataTableSettings,
} from '@kbn/unified-data-table';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { RowControlColumn, RowControlRowProps } from '@kbn/discover-utils';
import { AlertEpisodeDetailsFlyout } from '@kbn/alerting-v2-episodes-ui/components/details/details_flyout';
import { css } from '@emotion/react';
import deepEqual from 'fast-deep-equal';
import { useQueryClient } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useService } from '@kbn/core-di-browser';
import {
  EpisodeDataSourceProvider,
  useAdditionalEpisodesDataSource,
} from '@kbn/alerting-v2-episodes-ui/context/episode_data_source_context';
import { useFetchAlertingEpisodesQuery } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_alerting_episodes_query';
import { ALERT_EPISODES_LIST_PAGE_SIZE } from '@kbn/alerting-v2-episodes-ui/constants';
import { episodeSupportsTimeline } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import { useInvalidateEpisodeQueries } from '@kbn/alerting-v2-episodes-ui/hooks/use_invalidate_episode_queries';
import { useAlertingRulesCache } from '@kbn/alerting-v2-episodes-ui/hooks/use_alerting_rules_cache';
import { useAlertingRuleSourceDataViews } from '@kbn/alerting-v2-episodes-ui/hooks/use_alerting_rule_source_data_views';
import { getBreachEsqlQuery } from '@kbn/alerting-v2-schemas';
import {
  createEpisodeActions,
  OPEN_ALERT_EVENTS_HISTORY_ACTION_ID,
  type EpisodeAction,
} from '@kbn/alerting-v2-episodes-ui/actions';
import {
  EpisodeDurationCell,
  EpisodeSuppressedCell,
  EpisodeSourceCell,
  EpisodeStatusCell,
  EpisodeTagsCell,
  EpisodeRuleCell,
  EpisodeRuleTagsCell,
  EpisodeSeverityCell,
} from '@kbn/alerting-v2-episodes-ui/components/episodes_table_cell_renderers';
import { AlertEpisodeAssigneeCell } from '@kbn/alerting-v2-episodes-ui/components/assignee_cell';
import type { EpisodeDataSource } from '@kbn/alerting-v2-episodes-ui/types/episode_data_source';
import { EpisodesKpis } from '@kbn/alerting-v2-episodes-ui/components/episodes_kpis';
import { EpisodesHistogram } from '@kbn/alerting-v2-episodes-ui/components/episodes_histogram';
import { ClassicAlertDetailsFlyout } from '@kbn/alerting-v2-episodes-ui/components/classic_alert_details_flyout';
import { useEpisodesBulkActions } from '@kbn/alerting-v2-episodes-ui/hooks/use_episodes_bulk_actions';
import { alertEpisodeToDataTableRecord } from '@kbn/alerting-v2-episodes-ui/utils/alert_episode_to_data_table_record';
import { dataTableRecordToEpisode } from '@kbn/alerting-v2-episodes-ui/utils/data_table_record_to_episode';
import {
  canOpenDiscover,
  getDiscoverHrefForAlertEventsHistory,
  getDiscoverHrefForRuleAndAlertTimestamp,
} from '@kbn/alerting-v2-episodes-ui/utils/discover_href_for_alert';
import {
  filterAlertActionsByPrivilege,
  ALERT_ACTIONS_PRIVILEGE,
} from '@kbn/alerting-v2-episodes-ui/utils/filter_alert_actions_by_privilege';
import {
  DEFAULT_EPISODES_TABLE_SORT,
  DEFAULT_EPISODES_TABLE_VISIBLE_COLUMNS,
} from './utils/episodes_table_config';
import { useEpisodesTableConfig } from './hooks/use_episodes_table_config';
import { NewAlertingExperienceBanner } from './new_alerting_experience_banner';
import { RuleSummaryFlyoutContainer } from '../../components/rule/flyouts/rule_summary/rule_summary_flyout_container';
import { useComposeDiscoverFlyout } from '../../hooks/use_compose_discover_flyout';
import { useAlertingLocators } from '../../application/locator_context';
import type { AlertsKibanaServices } from '../../alerts_kibana_services';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import * as i18n from './translations';
import { EpisodesFilterBar } from './components/episodes_filter_bar';
import { useEpisodesListUrlState } from './hooks/use_episodes_list_url_state';
import { DEFAULT_EPISODES_LIST_FILTER } from './utils/episodes_list_url_state';
import { CLASSIC_ALERTS_DATA_SOURCE } from '../../alert_sources';
import { getQueryFilterState } from './utils/episodes_query_filter';
import { UserCapabilities } from '../../services/user_capabilities';
import { useManageRulesHref } from '../../application/manage_rules_href_context';

const getAlertsListMenu = ({ manageRulesHref }: { manageRulesHref: string }): AppHeaderMenu => ({
  primaryActionItem: {
    id: 'manageRules',
    label: i18n.EPISODES_LIST_MANAGE_RULES,
    iconType: 'gear',
    href: manageRulesHref,
    testId: 'alertingV2EpisodesListManageRules',
  },
});

const SUPPRESSED_COLUMN_ID = 'suppressed';

// Neither tag column is in the episodes query's `ALLOWLISTED_SORT_FIELDS`, so a sort on them
// falls back to `@timestamp` and only looks like it works.
const COLUMN_CUSTOMIZATIONS: CustomGridColumnsConfiguration = {
  tags: ({ column }: { column: EuiDataGridColumn }): EuiDataGridColumn => ({
    ...column,
    displayAsText: i18n.EPISODES_LIST_COLUMN_ALERT_TAGS,
    isSortable: false,
  }),
  rule_tags: ({ column }) => ({
    ...column,
    displayAsText: i18n.EPISODES_LIST_COLUMN_RULE_TAGS,
    isSortable: false,
  }),
  assignees: ({ column }) => ({
    ...column,
    displayAsText: i18n.EPISODES_LIST_COLUMN_ASSIGNEES,
  }),
  alerting_source: ({ column }) => ({
    ...column,
    displayAsText: i18n.EPISODES_LIST_COLUMN_SOURCE,
    isSortable: false,
  }),
  [SUPPRESSED_COLUMN_ID]: ({ column }) => ({
    ...column,
    displayAsText: i18n.EPISODES_LIST_COLUMN_SUPPRESSED,
    isSortable: false,
  }),
};

// Drops the default column actions this table can't support yet.
// - showHide: there is no way to add a column back, so a removed column would be lost for good.
const removeUnsupportedDefaultActions = (column: EuiDataGridColumn): EuiDataGridColumn =>
  column.actions ? { ...column, actions: { ...column.actions, showHide: false } } : column;

const CUSTOM_GRID_COLUMNS_CONFIGURATION: CustomGridColumnsConfiguration = Object.fromEntries(
  DEFAULT_EPISODES_TABLE_VISIBLE_COLUMNS.map((columnId) => [
    columnId,
    (props: Parameters<CustomGridColumnsConfiguration[string]>[0]) =>
      removeUnsupportedDefaultActions(COLUMN_CUSTOMIZATIONS[columnId]?.(props) ?? props.column),
  ])
);

/*
 * The table has a fixed height, independent of the KPIs and the histogram above it, so the grid
 * always measures a definite height and virtualizes rows.
 */
const TABLE_HEIGHT = 400;

/**
 * Two reasons this is a whole pixel value rather than the `1.6em` default:
 *
 * - The grid derives its row height from `parseInt` of the cell's computed line height, so the
 *   default (19.199px at the grid font size) under-allocates every row by ~1.6px.
 * - The row is one pixel taller than its cells (the row border is not part of the row height
 *   calculation), so the last line of a cell always loses a pixel to `overflow: hidden`.
 *
 * 24px leaves a 20px badge two pixels of slack per side, which survives that lost pixel. Other
 * data tables with badges in cells (asset inventory, entity analytics, cloud security) land on
 * the same value.
 */
const TABLE_ROW_LINE_HEIGHT = '24px';

const getTableCss = (euiTheme: EuiThemeComputed) => css`
  height: 100%;
  border-radius: ${euiTheme.border.radius.panel};
  border: ${euiTheme.border.thin};
  overflow: hidden;

  & .unifiedDataTableToolbar {
    padding-bottom: ${euiTheme.size.s};
  }

  & .unifiedDataTable__cellValue {
    font-family: unset;
  }

  & .euiDataGridRowCell__content:not(.euiDataGridRowCell__content--autoHeight) {
    block-size: 100%;
  }

  & .euiDataGridRowCell[data-gridcell-column-id='select'] .euiDataGridRowCell__content {
    justify-content: flex-start;
  }

  &
    .euiDataGridRowCell--controlColumn[data-gridcell-column-id='actions']
    .euiDataGridRowCell__content
    > .euiFlexGroup {
    justify-content: center;
  }
`;

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
  const queryClient = useQueryClient();
  const additionalDataSource = useAdditionalEpisodesDataSource();
  const alertsCapability = useService(UserCapabilities).canWrite('alerts')
    ? ALERT_ACTIONS_PRIVILEGE.all
    : ALERT_ACTIONS_PRIVILEGE.read;
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
  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>();
  const closeFlyout = useCallback(() => setExpandedDoc(undefined), []);
  const [ruleIdToView, setRuleIdToView] = useState<string | null>(null);
  const [sourceRuleInfoToView, setSourceRuleInfoToView] = useState<
    { category?: string } | undefined
  >();
  const closeRuleFlyout = useCallback(() => setRuleIdToView(null), []);
  const {
    flyout: composeFlyout,
    confirmationModal,
    openEditFlyout,
    openCloneFlyout,
  } = useComposeDiscoverFlyout();

  // The rule and the episode flyout occupy the same edge of the screen, so only one of them
  // can be open at a time.
  const openRuleFlyout = useCallback((ruleId: string, sourceRuleInfo?: { category?: string }) => {
    setExpandedDoc(undefined);
    setRuleIdToView(ruleId);
    setSourceRuleInfoToView(sourceRuleInfo);
  }, []);

  const expandDoc = useCallback((doc?: DataTableRecord) => {
    if (doc) {
      setRuleIdToView(null);
    }
    setExpandedDoc(doc);
  }, []);

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

  const loadedEpisodesCount = episodesData?.length ?? 0;
  const isEpisodeListCapped = loadedEpisodesCount >= ALERT_EPISODES_LIST_PAGE_SIZE;

  const sort: SortOrder[] = useMemo(
    () => [[sortState.sortField, sortState.sortDirection]],
    [sortState.sortField, sortState.sortDirection]
  );

  const settings: UnifiedDataTableSettings = useMemo(
    () => ({ columns: columnSettings }),
    [columnSettings]
  );

  const onSort = useCallback(
    (nextSort: string[][]) => {
      if (!nextSort.length) {
        setSort(DEFAULT_EPISODES_TABLE_SORT);
        return;
      }
      const [field, dir] = nextSort[nextSort.length - 1];
      if (field != null && dir != null) {
        setSort({
          sortField: String(field),
          sortDirection: dir === 'asc' ? 'asc' : 'desc',
        });
      }
    },
    [setSort]
  );

  const ruleIds = useMemo(
    () => [...new Set((episodesData ?? []).map((row) => row['rule.id']))],
    [episodesData]
  );

  const { rulesCache, loading: isLoadingRules } = useAlertingRulesCache({
    ruleIds,
    services,
  });

  const sourceDataViewsByRule = useAlertingRuleSourceDataViews({
    rules: rulesCache,
    dataViews: services.dataViews,
    http: services.http,
  });

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

  const rows = useMemo(() => episodesData?.map(alertEpisodeToDataTableRecord), [episodesData]);

  const renderCustomToolbar = useMemo(
    () =>
      getRenderCustomToolbarWithElements({
        leftSide: (
          <EuiFlexGroup
            alignItems="center"
            responsive={false}
            gutterSize="xs"
            css={css`
              ${logicalCSS('padding-horizontal', euiTheme.size.s)}
            `}
          >
            <EuiFlexItem grow={false}>
              {isEpisodeListCapped ? (
                <EuiToolTip
                  content={i18n.EPISODES_LIST_ITEM_COUNT_CAPPED_TOOLTIP(
                    ALERT_EPISODES_LIST_PAGE_SIZE
                  )}
                >
                  <EuiText size="xs" data-test-subj="alertEpisodesItemCount" tabIndex={0}>
                    {i18n.EPISODES_LIST_ITEM_COUNT_CAPPED(ALERT_EPISODES_LIST_PAGE_SIZE)}
                  </EuiText>
                </EuiToolTip>
              ) : (
                <EuiText size="xs" data-test-subj="alertEpisodesItemCount">
                  {i18n.EPISODES_LIST_ITEM_COUNT(loadedEpisodesCount)}
                </EuiText>
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                |
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
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
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      }),
    [
      euiTheme.size.s,
      handleClearFilters,
      hasActiveFilters,
      isEpisodeListCapped,
      loadedEpisodesCount,
    ]
  );

  const episodeActions: EpisodeAction[] = useMemo(
    () =>
      filterAlertActionsByPrivilege(
        createEpisodeActions({
          http: services.http,
          overlays: services.overlays,
          notifications: services.notifications,
          rendering: services.rendering,
          application: services.application,
          userProfile: services.userProfile,
          docLinks: services.docLinks,
          expressions: services.expressions,
          spaces: services.spaces,
          queryClient,
          additionalDataSource,
          isRuleAvailable: (ruleId) => Boolean(rulesCache[ruleId]),
          getDiscoverHref: ({ episodeIsoTimestamp, ruleId }) =>
            getDiscoverHrefForRuleAndAlertTimestamp({
              share: services.share,
              capabilities: services.application.capabilities,
              uiSettings: services.uiSettings,
              ruleEsql: rulesCache[ruleId]?.query
                ? getBreachEsqlQuery(rulesCache[ruleId]!.query)
                : undefined,
              alertIsoTimestamp: episodeIsoTimestamp,
            }),
          getAlertEventsHistoryHref: ({ episodeId, episodeStart, spaceId }) =>
            getDiscoverHrefForAlertEventsHistory({
              share: services.share,
              capabilities: services.application.capabilities,
              uiSettings: services.uiSettings,
              episodeId,
              episodeStart,
              spaceId,
            }),
          isAlertEventsHistoryAvailable: () =>
            canOpenDiscover({
              share: services.share,
              capabilities: services.application.capabilities,
              uiSettings: services.uiSettings,
            }),
        }),
        alertsCapability
      ),
    [services, queryClient, additionalDataSource, rulesCache, alertsCapability]
  );
  const tableEpisodeActions = useMemo(
    () => episodeActions.filter(({ id }) => id !== OPEN_ALERT_EVENTS_HISTORY_ACTION_ID),
    [episodeActions]
  );

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

  const renderDocumentView = useCallback<RenderDocumentViewCallback>(
    (hit) => {
      if (!episodeSupportsTimeline(dataTableRecordToEpisode(hit))) {
        return (
          <ClassicAlertDetailsFlyout
            alertId={hit.flattened['episode.id'] as string}
            onClose={closeFlyout}
            services={{ http: services.http }}
            actions={episodeActions}
            onSuccess={invalidateEpisodeQueries}
          />
        );
      }
      return (
        <AlertEpisodeDetailsFlyout
          episodeId={hit.flattened['episode.id'] as string}
          groupHash={hit.flattened.group_hash as string | undefined}
          sourceId={hit.flattened.source_id as string | undefined}
          onClose={closeFlyout}
          actions={episodeActions}
          getRuleDetailsHref={(ruleId) => getRuleDetailsHref(ruleId) ?? ''}
          getEpisodeDetailsHref={getEpisodeDetailsHref}
          services={{
            data: services.data,
            http: services.http,
            expressions: services.expressions,
            userProfile: services.userProfile,
            spaces: services.spaces,
            uiSettings: services.uiSettings,
            unifiedDocViewer: services.unifiedDocViewer,
            dataViews: services.dataViews,
          }}
        />
      );
    },
    [
      closeFlyout,
      episodeActions,
      getEpisodeDetailsHref,
      getRuleDetailsHref,
      invalidateEpisodeQueries,
      services,
    ]
  );

  const rowAdditionalLeadingControls: RowControlColumn[] = useMemo(
    () =>
      tableEpisodeActions.map((action) => ({
        id: action.id,
        isAvailable: ({ record }: RowControlRowProps) => {
          const episodes = [dataTableRecordToEpisode(record)];
          return action.showWhenDisabled?.({ episodes }) || action.isCompatible({ episodes });
        },
        render: (Control, { record }) => {
          const episodes = [dataTableRecordToEpisode(record)];
          if (action.renderMenuItem) {
            return (
              <Fragment key={action.id}>
                {action.renderMenuItem({
                  episodes,
                  onSuccess: invalidateEpisodeQueries,
                  surface: 'row_menu',
                })}
              </Fragment>
            );
          }
          const compatible = action.isCompatible({ episodes });
          const disabled = !compatible;
          const control = (
            <Control
              iconType={action.iconType}
              label={action.displayName}
              disabled={disabled}
              onClick={() => action.execute({ episodes, onSuccess: invalidateEpisodeQueries })}
              tooltipContent={disabled ? undefined : action.displayName}
            />
          );
          if (disabled && action.disabledTooltip) {
            return (
              <EuiToolTip content={action.disabledTooltip}>
                <span tabIndex={0} css={{ display: 'contents' }}>
                  {control}
                </span>
              </EuiToolTip>
            );
          }
          return control;
        },
      })),
    [tableEpisodeActions, invalidateEpisodeQueries]
  );

  const customBulkActions = useEpisodesBulkActions({
    actions: tableEpisodeActions,
    episodesData,
    onSuccess: invalidateEpisodeQueries,
  });

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

  const onSetColumns = useCallback(
    (cols: string[], _hideTimeCol: boolean) => {
      setVisibleColumns(cols);
    },
    [setVisibleColumns]
  );

  const locatorHref = rulesLocators.useUrl({});
  const manageRulesHrefOverride = useManageRulesHref();
  const manageRulesHref = manageRulesHrefOverride ?? locatorHref;

  const externalCustomRenderers = useMemo<CustomCellRenderer>(
    () => ({
      'episode.status': (props) => <EpisodeStatusCell {...props} />,
      alerting_source: (props) => <EpisodeSourceCell {...props} />,
      [SUPPRESSED_COLUMN_ID]: (props) => <EpisodeSuppressedCell {...props} />,
      duration: (props) => <EpisodeDurationCell {...props} />,
      severity: (props) => <EpisodeSeverityCell {...props} />,
      tags: (props) => <EpisodeTagsCell {...props} />,
      rule_tags: (props) => (
        <EpisodeRuleTagsCell {...props} rulesCache={rulesCache} isLoadingRules={isLoadingRules} />
      ),
      'rule.id': (props) => (
        <EpisodeRuleCell
          {...props}
          rulesCache={rulesCache}
          isLoadingRules={isLoadingRules}
          rowHeight={rowHeight}
          getRuleDetailsHref={getRuleDetailsHref}
          onRuleNameClick={openRuleFlyout}
          sourceDataViewsByRule={sourceDataViewsByRule}
        />
      ),
      assignees: (props) => {
        const assigneeUid = props.row.flattened.last_assignee_uid as string | undefined;
        return (
          <AlertEpisodeAssigneeCell assigneeUid={assigneeUid} userProfile={services.userProfile} />
        );
      },
    }),
    [
      rulesCache,
      isLoadingRules,
      rowHeight,
      getRuleDetailsHref,
      openRuleFlyout,
      services.userProfile,
      sourceDataViewsByRule,
    ]
  );

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
              <CellActionsProvider
                getTriggerCompatibleActions={services.uiActions.getTriggerCompatibleActions}
              >
                <EuiScreenReaderOnly>
                  <span id="alertingEpisodesTableAriaLabel">
                    {i18n.EPISODES_LIST_TABLE_ARIA_LABEL}
                  </span>
                </EuiScreenReaderOnly>
                {!dataView ? (
                  <EuiLoadingSpinner data-test-subj="alertingV2EpisodesListTable-loading" />
                ) : (
                  <UnifiedDataTable
                    ariaLabelledBy="alertingEpisodesTableAriaLabel"
                    settings={settings}
                    css={getTableCss(euiTheme)}
                    gridStyleOverride={{
                      stripes: false,
                      cellPadding: 'l',
                      header: 'shade',
                    }}
                    rowLineHeightOverride={TABLE_ROW_LINE_HEIGHT}
                    dataView={dataView}
                    columns={visibleColumns}
                    onSetColumns={onSetColumns}
                    canDragAndDropColumns
                    showTimeCol={!!dataView.timeFieldName}
                    customGridColumnsConfiguration={CUSTOM_GRID_COLUMNS_CONFIGURATION}
                    externalCustomRenderers={externalCustomRenderers}
                    rows={rows}
                    // Report one more hit than the cap only when the list is capped, so the
                    // grid footer shows the max limit callout and nothing else
                    totalHits={
                      isEpisodeListCapped ? ALERT_EPISODES_LIST_PAGE_SIZE + 1 : loadedEpisodesCount
                    }
                    loadingState={isLoading ? DataLoadingState.loading : DataLoadingState.loaded}
                    isPaginationEnabled
                    paginationMode="singlePage"
                    sampleSizeState={ALERT_EPISODES_LIST_PAGE_SIZE}
                    isSortEnabled
                    sort={sort}
                    onSort={onSort}
                    onResize={onResize}
                    rowHeightState={rowHeight}
                    onUpdateRowHeight={setRowHeight}
                    configRowHeight={rowHeight}
                    customBulkActions={customBulkActions}
                    hideDefaultBulkActions
                    rowAdditionalLeadingControls={rowAdditionalLeadingControls}
                    visibleRowLeadingControls={3}
                    enableComparisonMode={false}
                    services={services}
                    expandedDoc={expandedDoc}
                    setExpandedDoc={expandDoc}
                    renderDocumentView={renderDocumentView}
                    renderCustomToolbar={renderCustomToolbar}
                  />
                )}
              </CellActionsProvider>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
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
    </div>
  );
};
