/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiThemeComputed } from '@elastic/eui';
import { map } from 'rxjs';
import {
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageHeader,
  EuiScreenReaderOnly,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  logicalCSS,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CellActionsProvider } from '@kbn/cell-actions';
import type { SortOrder } from '@kbn/unified-data-table';
import {
  DataLoadingState,
  UnifiedDataTable,
  type UnifiedDataTableSettings,
} from '@kbn/unified-data-table';
import { css } from '@emotion/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { AlertEpisodeStatus } from '@kbn/alerting-v2-schemas';
import { useFetchAlertingEpisodesQuery } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_alerting_episodes_query';
import { useFetchEpisodeActions } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_episode_actions';
import { useFetchGroupActions } from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_group_actions';
import { AlertEpisodeStatusBadges } from '@kbn/alerting-v2-episodes-ui/components/status/status_badges';
import { AlertEpisodeActions } from '@kbn/alerting-v2-episodes-ui/components/actions/actions';
import { AlertEpisodeTags } from '@kbn/alerting-v2-episodes-ui/components/actions/tags';
import type {
  AlertEpisode,
  EpisodesFilterState,
  EpisodesSortState,
} from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import { useAlertingRulesCache } from '@kbn/alerting-v2-episodes-ui/hooks/use_alerting_rules_cache';
import useObservable from 'react-use/lib/useObservable';
import type { InputTimeRange } from '@kbn/data-plugin/public/query';
import type { DataTableRecord } from '@kbn/discover-utils';
import { paths } from '../../constants';
import type { AlertEpisodesKibanaServices } from '../../episodes_kibana_services';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { EpisodesFilterBar } from './components/episodes_filter_bar';

const PAGE_SIZE = 1000;

const DEFAULT_SORT: EpisodesSortState = { sortField: '@timestamp', sortDirection: 'desc' };

const ALERT_EPISODES_TABLE_SETTINGS: UnifiedDataTableSettings = {
  columns: {
    duration: { width: 100 },
    actions: { width: 360 },
    'episode.status': { width: 220 },
  },
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

const alertEpisodeToDataTableRecord = (row: AlertEpisode, idx: number): DataTableRecord => ({
  id: String(idx),
  raw: {},
  flattened: Object.fromEntries(Object.entries(row)),
});

function EmptyToolbar() {
  return <></>;
}

export const AlertEpisodesListPage = () => {
  const services = useKibana<AlertEpisodesKibanaServices>().services;
  const { euiTheme } = useEuiTheme();
  const timefilter = services.data.query.timefilter.timefilter;

  useBreadcrumbs('episodes_list');

  const timeRange$ = useMemo(
    () => timefilter.getTimeUpdate$().pipe(map(() => timefilter.getTime())),
    [timefilter]
  );

  const timeRange = useObservable(
    timeRange$,
    timefilter?.getTime() ?? { from: 'now-24h', to: 'now' }
  );

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

  const handleTimeChange = useCallback(
    (range: InputTimeRange) => {
      timefilter.setTime(range);
    },
    [timefilter]
  );

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
    () => episodesData?.map((row) => row['episode.id']).filter(Boolean),
    [episodesData]
  );

  const groupHashes = useMemo(
    () => [...new Set(episodesData?.map((row) => row.group_hash).filter(Boolean))],
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
      <EuiPageHeader
        bottomBorder
        pageTitle={i18n.translate('xpack.alertingV2.episodes.listPageTitle', {
          defaultMessage: 'Alert episodes',
        })}
      />
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
              <span id="alertingEpisodesTableAriaLabel">
                {i18n.translate('xpack.alertingV2.episodes.tableAriaLabel', {
                  defaultMessage: 'Alerting episodes table',
                })}
              </span>
            </EuiScreenReaderOnly>
            {!dataView ? (
              <EuiLoadingSpinner />
            ) : (
              <UnifiedDataTable
                ariaLabelledBy="alertingEpisodesTableAriaLabel"
                settings={ALERT_EPISODES_TABLE_SETTINGS}
                css={getTableCss(euiTheme)}
                gridStyleOverride={{
                  stripes: false,
                  cellPadding: 'l',
                }}
                renderCustomToolbar={EmptyToolbar}
                dataView={dataView}
                columns={columns}
                onSetColumns={onSetColumns}
                canDragAndDropColumns
                showTimeCol={!!dataView.timeFieldName}
                customGridColumnsConfiguration={{
                  actions: ({ column }) => ({
                    ...column,
                    displayAsText: i18n.translate('xpack.alertingV2.episodes.columns.actions', {
                      defaultMessage: 'Actions',
                    }),
                  }),
                  tags: ({ column }) => ({
                    ...column,
                    displayAsText: i18n.translate('xpack.alertingV2.episodes.columns.tags', {
                      defaultMessage: 'Tags',
                    }),
                  }),
                }}
                externalCustomRenderers={{
                  'episode.status': (props) => {
                    const status = props.row.flattened[props.columnId] as AlertEpisodeStatus;
                    const episodeId = props.row.flattened['episode.id'] as string;
                    const groupHash = props.row.flattened.group_hash as string;

                    return (
                      <AlertEpisodeStatusBadges
                        status={status}
                        episodeAction={episodeActionsMap?.get(episodeId)}
                        groupAction={groupActionsMap?.get(groupHash)}
                      />
                    );
                  },
                  actions: (props) => {
                    const episodeId = props.row.flattened['episode.id'] as string;
                    const groupHash = props.row.flattened.group_hash as string;

                    return (
                      <AlertEpisodeActions
                        episodeId={episodeId}
                        groupHash={groupHash}
                        episodeAction={episodeActionsMap?.get(episodeId)}
                        groupAction={groupActionsMap?.get(groupHash)}
                        http={services.http}
                        viewDetailsHref={
                          episodeId
                            ? services.http.basePath.prepend(paths.alertEpisodeDetails(episodeId))
                            : undefined
                        }
                      />
                    );
                  },
                  tags: (props) => {
                    const groupHash = props.row.flattened.group_hash as string;
                    const groupAction = groupActionsMap?.get(groupHash);

                    return <AlertEpisodeTags tags={groupAction?.tags ?? []} />;
                  },
                  'rule.id': (props) => {
                    if (!Object.keys(rulesCache).length && isLoadingRules) {
                      return <EuiSkeletonText />;
                    }
                    const ruleId = props.row.flattened[props.columnId] as string;
                    const rule = rulesCache[ruleId];
                    if (!rule) {
                      return ruleId;
                    }
                    const ruleName = (
                      <EuiText
                        size="s"
                        css={css`
                          font-weight: ${euiTheme.font.weight.semiBold};
                        `}
                      >
                        {rule.metadata.name}
                      </EuiText>
                    );
                    if (rowHeight === 1) {
                      return ruleName;
                    }
                    return (
                      <EuiFlexGroup direction="column" gutterSize="none">
                        <EuiFlexItem>{ruleName}</EuiFlexItem>
                        <EuiFlexItem>
                          <EuiCode
                            color="subdued"
                            css={css`
                              background: none;
                              color: ${euiTheme.colors.mediumShade};
                              font-size: ${euiTheme.font.scale.xs};
                              white-space: nowrap;
                              overflow: hidden;
                              text-overflow: ellipsis;
                              padding: 0;
                            `}
                          >
                            {rule.evaluation.query.base}
                          </EuiCode>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    );
                  },
                }}
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
                services={services}
              />
            )}
          </CellActionsProvider>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
