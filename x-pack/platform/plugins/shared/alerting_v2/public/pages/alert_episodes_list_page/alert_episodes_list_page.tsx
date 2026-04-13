/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiDataGridColumn, EuiThemeComputed } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageHeader,
  EuiScreenReaderOnly,
  EuiSpacer,
  logicalCSS,
  useEuiTheme,
} from '@elastic/eui';
import { CellActionsProvider } from '@kbn/cell-actions';
import type { SortOrder } from '@kbn/unified-data-table';
import {
  DataLoadingState,
  UnifiedDataTable,
  type CustomCellRenderer,
  type CustomGridColumnsConfiguration,
  type UnifiedDataTableSettings,
} from '@kbn/unified-data-table';
import { css } from '@emotion/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useFetchAlertingEpisodesQuery } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_alerting_episodes_query';
import { useFetchEpisodeActions } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_actions';
import { useFetchGroupActions } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_group_actions';
import type {
  EpisodesFilterState,
  EpisodesSortState,
} from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import { useAlertingRulesCache } from '@kbn/alerting-v2-episodes-ui/hooks/use_alerting_rules_cache';
import { BulkActionsOverlay } from '@kbn/alerting-v2-episodes-ui/components/bulk_actions_overlay';
import {
  EpisodeStatusCell,
  EpisodeActionsCell,
  EpisodeTagsCell,
  EpisodeRuleCell,
} from '@kbn/alerting-v2-episodes-ui/components/episodes_table_cell_renderers';
import type { AlertEpisodesKibanaServices } from '../../episodes_kibana_services';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import * as i18n from './translations';
import { EpisodesFilterBar } from './components/episodes_filter_bar';
import { alertEpisodeToDataTableRecord } from './utils';
import { getDiscoverHrefForRuleAndEpisodeTimestamp } from '../../utils/discover_href_for_episode';
import { paths } from '../../constants';
import { useEpisodesTimeRange } from './hooks/use_episodes_time_range';
import { useEpisodesBulkActions } from './hooks/use_episodes_bulk_actions';

const PAGE_SIZE = 1000;

const DEFAULT_SORT: EpisodesSortState = { sortField: '@timestamp', sortDirection: 'desc' };

const ALERT_EPISODES_TABLE_SETTINGS: UnifiedDataTableSettings = {
  columns: {
    duration: { width: 100 },
    actions: { width: 360 },
    'episode.status': { width: 220 },
  },
};

const CUSTOM_GRID_COLUMNS_CONFIGURATION: CustomGridColumnsConfiguration = {
  actions: ({ column }: { column: EuiDataGridColumn }): EuiDataGridColumn => ({
    ...column,
    displayAsText: i18n.COLUMN_ACTIONS,
  }),
  tags: ({ column }: { column: EuiDataGridColumn }): EuiDataGridColumn => ({
    ...column,
    displayAsText: i18n.COLUMN_TAGS,
  }),
};

const getTableCss = (euiTheme: EuiThemeComputed) => css`
  height: 100%;
  border-radius: ${euiTheme.border.radius.medium};
  border: ${euiTheme.border.thin};
  overflow: hidden;

  & .unifiedDataTable__cellValue {
    font-family: unset;
  }

  & .euiDataGridRowCell__content {
    display: flex;
    align-items: center;
  }

  & .euiDataGridRowCell[data-gridcell-column-id='select'] .euiDataGridRowCell__content {
    align-items: center;
    justify-content: flex-start;
    height: 100%;
  }

  & .euiDataGridRowCell[data-gridcell-column-id='actions'] .euiDataGridRowCell__content {
    justify-content: flex-end;
  }
`;

export const AlertEpisodesListPage = () => {
  const services = useKibana<AlertEpisodesKibanaServices>().services;
  const { euiTheme } = useEuiTheme();
  const timefilter = services.data.query.timefilter.timefilter;

  useBreadcrumbs('episodes_list');

  const { timeRange, handleTimeChange } = useEpisodesTimeRange(timefilter);

  const [filterState, setFilterState] = useState<EpisodesFilterState>({});
  const [sortState, setSortState] = useState<EpisodesSortState>(DEFAULT_SORT);
  const [columns, setColumns] = useState<string[]>([
    'episode.status',
    '@timestamp',
    'rule.id',
    'duration',
    'tags',
    'actions',
  ]);
  const [rowHeight, setRowHeight] = useState(2);

  const {
    data: episodesData,
    dataView,
    isLoading,
    refetch,
  } = useFetchAlertingEpisodesQuery({
    pageSize: PAGE_SIZE,
    services,
    filterState,
    sortState,
    timeRange,
  });

  const sort: SortOrder[] = useMemo(
    () => [[sortState.sortField, sortState.sortDirection]],
    [sortState.sortField, sortState.sortDirection]
  );

  const onSort = useCallback((nextSort: string[][]) => {
    if (!nextSort.length) {
      setSortState(DEFAULT_SORT);
      return;
    }
    const [field, dir] = nextSort[nextSort.length - 1];
    if (field != null && dir != null) {
      setSortState({
        sortField: String(field),
        sortDirection: dir === 'asc' ? 'asc' : 'desc',
      });
    }
  }, []);

  const ruleIds = useMemo(
    () => [...new Set(episodesData?.map((row) => row['rule.id']) ?? [])],
    [episodesData]
  );

  const { rulesCache, loading: isLoadingRules } = useAlertingRulesCache({
    ruleIds,
    services,
  });

  const ruleOptions = useMemo(
    () =>
      Object.entries(rulesCache).map(([id, rule]) => ({
        label: rule.metadata?.name ?? id,
        value: id,
      })),
    [rulesCache]
  );

  const rows = useMemo(() => episodesData?.map(alertEpisodeToDataTableRecord), [episodesData]);

  const episodeIds = useMemo(
    () => episodesData?.map((row) => row['episode.id']).filter((id): id is string => id != null),
    [episodesData]
  );

  const groupHashes = useMemo(
    () => [
      ...new Set(
        episodesData?.map((row) => row.group_hash).filter((h): h is string => h != null) ?? []
      ),
    ],
    [episodesData]
  );

  const { data: episodeActionsMap } = useFetchEpisodeActions({
    episodeIds: episodeIds ?? [],
    services,
  });
  const { data: groupActionsMap } = useFetchGroupActions({ groupHashes, services });

  const onSetColumns = useCallback((cols: string[], _hideTimeCol: boolean) => {
    setColumns(cols);
  }, []);

  const {
    customBulkActions,
    tableKey,
    pendingBulkState,
    onPendingBulkClose,
    onApplyBulkSnooze,
    onBulkSaveTags,
  } = useEpisodesBulkActions({
    episodesData,
    http: services.http,
    toastNotifications: services.toastNotifications,
    refetch,
  });

  const externalCustomRenderers = useMemo<CustomCellRenderer>(
    () => ({
      'episode.status': (props) => (
        <EpisodeStatusCell
          {...props}
          episodeActionsMap={episodeActionsMap}
          groupActionsMap={groupActionsMap}
        />
      ),
      actions: (props) => {
        const ruleId = props.row.flattened['rule.id'] as string;
        const episodeId = props.row.flattened['episode.id'] as string;
        const discoverHref = getDiscoverHrefForRuleAndEpisodeTimestamp({
          share: services.share,
          capabilities: services.application.capabilities,
          uiSettings: services.uiSettings,
          ruleEsql: rulesCache[ruleId]?.evaluation?.query?.base,
          episodeIsoTimestamp: props.row.flattened['@timestamp'] as string,
        });
        const viewDetailsHref = episodeId
          ? services.http.basePath.prepend(paths.alertEpisodeDetails(episodeId))
          : undefined;
        return (
          <EpisodeActionsCell
            {...props}
            episodeActionsMap={episodeActionsMap}
            groupActionsMap={groupActionsMap}
            discoverHref={discoverHref}
            viewDetailsHref={viewDetailsHref}
            http={services.http}
            expressions={services.expressions}
          />
        );
      },
      tags: (props) => <EpisodeTagsCell {...props} groupActionsMap={groupActionsMap} />,
      'rule.id': (props) => (
        <EpisodeRuleCell
          {...props}
          rulesCache={rulesCache}
          isLoadingRules={isLoadingRules}
          rowHeight={rowHeight}
        />
      ),
    }),
    [episodeActionsMap, groupActionsMap, rulesCache, isLoadingRules, rowHeight, services]
  );

  return (
    <div
      data-test-subj="alertingV2EpisodesListPage"
      css={css`
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        ${logicalCSS('min-height')}: 0;
        min-width: 0;
      `}
    >
      <EuiPageHeader bottomBorder pageTitle={i18n.LIST_PAGE_TITLE} />
      <EuiSpacer size="m" />

      <EuiFlexGroup
        direction="column"
        css={css`
          flex: 1;
          min-width: 0;
        `}
      >
        <EuiFlexItem grow={false}>
          <EpisodesFilterBar
            filterState={filterState}
            onFilterChange={setFilterState}
            timeRange={timeRange}
            onTimeChange={handleTimeChange}
            ruleOptions={ruleOptions}
            onRefresh={() => refetch()}
            isLoading={isLoading}
            services={services}
          />
          <EuiSpacer size="s" />
        </EuiFlexItem>
        <EuiFlexItem
          grow
          css={css`
            min-width: 0;
          `}
        >
          <CellActionsProvider
            getTriggerCompatibleActions={services.uiActions.getTriggerCompatibleActions}
          >
            <EuiScreenReaderOnly>
              <span id="alertingEpisodesTableAriaLabel">{i18n.TABLE_ARIA_LABEL}</span>
            </EuiScreenReaderOnly>
            {!dataView ? (
              <EuiLoadingSpinner />
            ) : (
              <UnifiedDataTable
                key={tableKey}
                ariaLabelledBy="alertingEpisodesTableAriaLabel"
                settings={ALERT_EPISODES_TABLE_SETTINGS}
                css={getTableCss(euiTheme)}
                gridStyleOverride={{
                  stripes: false,
                  cellPadding: 'l',
                }}
                dataView={dataView}
                columns={columns}
                onSetColumns={onSetColumns}
                canDragAndDropColumns
                showTimeCol={!!dataView.timeFieldName}
                customGridColumnsConfiguration={CUSTOM_GRID_COLUMNS_CONFIGURATION}
                externalCustomRenderers={externalCustomRenderers}
                rows={rows}
                totalHits={!episodesData?.length ? 0 : PAGE_SIZE + 1}
                loadingState={isLoading ? DataLoadingState.loading : DataLoadingState.loaded}
                isPaginationEnabled
                paginationMode="singlePage"
                sampleSizeState={PAGE_SIZE}
                isSortEnabled
                sort={sort}
                onSort={onSort}
                rowHeightState={rowHeight}
                onUpdateRowHeight={setRowHeight}
                customBulkActions={customBulkActions}
                services={services}
              />
            )}
          </CellActionsProvider>
        </EuiFlexItem>
      </EuiFlexGroup>
      <BulkActionsOverlay
        pendingBulkState={pendingBulkState}
        onClose={onPendingBulkClose}
        onApplySnooze={onApplyBulkSnooze}
        onSaveTags={onBulkSaveTags}
        expressions={services.expressions}
      />
    </div>
  );
};
