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
import { CellActionsProvider } from '@kbn/cell-actions';
import type { CustomBulkActions, SortOrder } from '@kbn/unified-data-table';
import {
  DataLoadingState,
  UnifiedDataTable,
  type UnifiedDataTableSettings,
} from '@kbn/unified-data-table';
import { css } from '@emotion/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { AlertEpisodeStatus, BulkCreateAlertActionBody } from '@kbn/alerting-v2-schemas';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
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
import { useBulkCreateAlertActions } from '@kbn/alerting-v2-episodes-ui/hooks/use_bulk_create_alert_actions';
import { BulkSnoozeModal } from '@kbn/alerting-v2-episodes-ui/components/actions/bulk_snooze_modal';
import { AlertEpisodeTagsFlyout } from '@kbn/alerting-v2-episodes-ui/components/actions/alert_episode_tags_flyout';
import useObservable from 'react-use/lib/useObservable';
import type { InputTimeRange } from '@kbn/data-plugin/public/query';
import type { DataTableRecord } from '@kbn/discover-utils';
import { paths } from '../../constants';
import type { AlertEpisodesKibanaServices } from '../../episodes_kibana_services';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { getDiscoverHrefForRuleAndEpisodeTimestamp } from '../../utils/discover_href_for_episode';
import * as i18n from './translations';
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

const getEpisodesFromDocIds = (
  selectedDocIds: string[],
  episodesData: AlertEpisode[]
): AlertEpisode[] => selectedDocIds.map((id) => episodesData[parseInt(id, 10)]).filter(Boolean);

const uniqueGroupEpisodes = (episodes: AlertEpisode[]): AlertEpisode[] => {
  const seen = new Set<string>();
  return episodes.filter((ep) => {
    if (!ep.group_hash || seen.has(ep.group_hash)) return false;
    seen.add(ep.group_hash);
    return true;
  });
};

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
  const [pendingBulkState, setPendingBulkState] = useState<{
    action: 'snooze' | 'tag';
    selectedDocIds: string[];
  } | null>(null);
  const [tableKey, setTableKey] = useState(0);

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

  const { mutate: bulkMutate } = useBulkCreateAlertActions(services.http);

  const onBulkSuccess = useCallback(
    ({ processed, total }: { processed: number; total: number }) => {
      if (processed === total) {
        services.toastNotifications.addSuccess(i18n.getBulkSuccessToast(processed));
      } else {
        services.toastNotifications.addWarning(i18n.getBulkPartialSuccessToast(processed, total));
      }
      setTableKey((k) => k + 1);
      refetch();
    },
    [services.toastNotifications, refetch]
  );

  const onBulkError = useCallback(() => {
    services.toastNotifications.addDanger(i18n.BULK_ERROR_TOAST);
  }, [services.toastNotifications]);

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

  const customBulkActions = useMemo<CustomBulkActions>(
    () => [
      {
        key: 'acknowledge',
        label: i18n.BULK_ACKNOWLEDGE,
        onClick: ({ selectedDocIds }) => {
          const items: BulkCreateAlertActionBody = getEpisodesFromDocIds(
            selectedDocIds,
            episodesData ?? []
          ).map((ep) => ({
            group_hash: ep.group_hash,
            action_type: ALERT_EPISODE_ACTION_TYPE.ACK,
            episode_id: ep['episode.id'],
          })) as BulkCreateAlertActionBody;
          if (items.length) bulkMutate(items, { onSuccess: onBulkSuccess, onError: onBulkError });
        },
      },
      {
        key: 'unacknowledge',
        label: i18n.BULK_UNACKNOWLEDGE,
        onClick: ({ selectedDocIds }) => {
          const items: BulkCreateAlertActionBody = getEpisodesFromDocIds(
            selectedDocIds,
            episodesData ?? []
          ).map((ep) => ({
            group_hash: ep.group_hash,
            action_type: ALERT_EPISODE_ACTION_TYPE.UNACK,
            episode_id: ep['episode.id'],
          })) as BulkCreateAlertActionBody;
          if (items.length) bulkMutate(items, { onSuccess: onBulkSuccess, onError: onBulkError });
        },
      },
      {
        key: 'snooze',
        label: i18n.BULK_SNOOZE,
        onClick: ({ selectedDocIds }) => {
          setPendingBulkState({ action: 'snooze', selectedDocIds });
        },
      },
      {
        key: 'unsnooze',
        label: i18n.BULK_UNSNOOZE,
        onClick: ({ selectedDocIds }) => {
          const items: BulkCreateAlertActionBody = uniqueGroupEpisodes(
            getEpisodesFromDocIds(selectedDocIds, episodesData ?? [])
          ).map((ep) => ({
            group_hash: ep.group_hash,
            action_type: ALERT_EPISODE_ACTION_TYPE.UNSNOOZE,
          })) as BulkCreateAlertActionBody;
          if (items.length) bulkMutate(items, { onSuccess: onBulkSuccess, onError: onBulkError });
        },
      },
      {
        key: 'resolve',
        label: i18n.BULK_RESOLVE,
        onClick: ({ selectedDocIds }) => {
          const items: BulkCreateAlertActionBody = uniqueGroupEpisodes(
            getEpisodesFromDocIds(selectedDocIds, episodesData ?? [])
          ).map((ep) => ({
            group_hash: ep.group_hash,
            action_type: ALERT_EPISODE_ACTION_TYPE.DEACTIVATE,
            reason: i18n.RESOLVE_ACTION_REASON,
          })) as BulkCreateAlertActionBody;
          if (items.length) bulkMutate(items, { onSuccess: onBulkSuccess, onError: onBulkError });
        },
      },
      {
        key: 'activate',
        label: i18n.BULK_ACTIVATE,
        onClick: ({ selectedDocIds }) => {
          const items: BulkCreateAlertActionBody = uniqueGroupEpisodes(
            getEpisodesFromDocIds(selectedDocIds, episodesData ?? [])
          ).map((ep) => ({
            group_hash: ep.group_hash,
            action_type: ALERT_EPISODE_ACTION_TYPE.ACTIVATE,
            reason: i18n.RESOLVE_ACTION_REASON,
          })) as BulkCreateAlertActionBody;
          if (items.length) bulkMutate(items, { onSuccess: onBulkSuccess, onError: onBulkError });
        },
      },
      {
        key: 'edit-tags',
        label: i18n.BULK_EDIT_TAGS,
        onClick: ({ selectedDocIds }) => {
          setPendingBulkState({ action: 'tag', selectedDocIds });
        },
      },
    ],
    [episodesData, bulkMutate, onBulkSuccess, onBulkError]
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
                customGridColumnsConfiguration={{
                  actions: ({ column }) => ({
                    ...column,
                    displayAsText: i18n.COLUMN_ACTIONS,
                  }),
                  tags: ({ column }) => ({
                    ...column,
                    displayAsText: i18n.COLUMN_TAGS,
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
                    const ruleId = props.row.flattened['rule.id'] as string;
                    const discoverHref = getDiscoverHrefForRuleAndEpisodeTimestamp({
                      share: services.share,
                      capabilities: services.application.capabilities,
                      uiSettings: services.uiSettings,
                      ruleEsql: rulesCache[ruleId]?.evaluation?.query?.base,
                      episodeIsoTimestamp: props.row.flattened['@timestamp'] as string,
                    });

                    return (
                      <AlertEpisodeActions
                        episodeId={episodeId}
                        groupHash={groupHash}
                        episodeAction={episodeActionsMap?.get(episodeId)}
                        groupAction={groupActionsMap?.get(groupHash)}
                        http={services.http}
                        openInDiscoverHref={discoverHref}
                        expressions={services.expressions}
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
                customBulkActions={customBulkActions}
                services={services}
              />
            )}
          </CellActionsProvider>
        </EuiFlexItem>
      </EuiFlexGroup>
      {pendingBulkState?.action === 'snooze' && (
        <BulkSnoozeModal
          onClose={() => setPendingBulkState(null)}
          onApplySnooze={(expiry) => {
            const items: BulkCreateAlertActionBody = uniqueGroupEpisodes(
              getEpisodesFromDocIds(pendingBulkState?.selectedDocIds ?? [], episodesData ?? [])
            ).map((ep) => ({
              group_hash: ep.group_hash,
              action_type: ALERT_EPISODE_ACTION_TYPE.SNOOZE,
              expiry,
            })) as BulkCreateAlertActionBody;
            if (items.length) bulkMutate(items, { onSuccess: onBulkSuccess, onError: onBulkError });
            // Note: BulkSnoozeModal auto-closes (calls onClose internally after onApplySnooze)
          }}
        />
      )}
      {pendingBulkState?.action === 'tag' && (
        <AlertEpisodeTagsFlyout
          isOpen={true}
          onClose={() => setPendingBulkState(null)}
          // groupHash is required by the prop interface but unused in bulk mode
          // (onSave bypasses the flyout's internal single-row mutation)
          groupHash=""
          // Start with no pre-selected tags in bulk mode since selections may differ across groups
          currentTags={[]}
          http={services.http}
          services={{ expressions: services.expressions }}
          onSave={(tags) => {
            const items: BulkCreateAlertActionBody = uniqueGroupEpisodes(
              getEpisodesFromDocIds(pendingBulkState?.selectedDocIds ?? [], episodesData ?? [])
            ).map((ep) => ({
              group_hash: ep.group_hash,
              action_type: ALERT_EPISODE_ACTION_TYPE.TAG,
              tags,
            })) as BulkCreateAlertActionBody;
            if (items.length) bulkMutate(items, { onSuccess: onBulkSuccess, onError: onBulkError });
            // onClose is called automatically by the flyout's handleSave after onSave returns
          }}
        />
      )}
    </div>
  );
};
