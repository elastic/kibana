/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { EuiDataGridColumn, EuiThemeComputed } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiScreenReaderOnly,
  EuiText,
  EuiToolTip,
  logicalCSS,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { CellActionsProvider } from '@kbn/cell-actions';
import type {
  ApplicationStart,
  DocLinksStart,
  IUiSettingsClient,
  OverlayStart,
  ThemeServiceStart,
} from '@kbn/core/public';
import type { CoreStart } from '@kbn/core/public';
import type { HttpStart } from '@kbn/core-http-browser';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { UnifiedDocViewerStart } from '@kbn/unified-doc-viewer-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { RowControlColumn, RowControlRowProps } from '@kbn/discover-utils';
import type { RenderDocumentViewCallback, SortOrder } from '@kbn/unified-data-table';
import {
  DataLoadingState,
  UnifiedDataTable,
  getRenderCustomToolbarWithElements,
  getRowHeight,
  type CustomCellRenderer,
  type CustomGridColumnsConfiguration,
  type UnifiedDataTableSettings,
} from '@kbn/unified-data-table';
import type { EpisodesFilterState, EpisodesSortState } from '@kbn/alerting-v2-common-queries';
import { AlertEpisodeDetailsFlyout } from '../details/details_flyout';
import { AlertEpisodeAssigneeCell } from '../assignee_cell';
import {
  EpisodeDurationCell,
  EpisodeSuppressedCell,
  EpisodeSourceCell,
  EpisodeStatusCell,
  EpisodeTagsCell,
  EpisodeRuleCell,
  EpisodeRuleTagsCell,
  EpisodeSeverityCell,
} from '../episodes_table_cell_renderers';
import { ClassicAlertDetailsFlyout } from '../classic_alert_details_flyout';
import { OPEN_ALERT_EVENTS_HISTORY_ACTION_ID, type EpisodeAction } from '../../actions';
import { ALERT_EPISODES_LIST_PAGE_SIZE } from '../../constants';
import { episodeSupportsTimeline } from '../../queries/episodes_query';
import { useAlertingRulesCache } from '../../hooks/use_alerting_rules_cache';
import { useAlertingRuleSourceDataViews } from '../../hooks/use_alerting_rule_source_data_views';
import { useEpisodeActions } from '../../hooks/use_episode_actions';
import { useEpisodesBulkActions } from '../../hooks/use_episodes_bulk_actions';
import { useAlertHost } from '../../context/alert_host_context';
import { resolveTableHeight, TABLE_ROW_LINE_HEIGHT_PX } from '../../utils/resolve_table_height';
import { useFetchAlertingEpisodesQuery } from '../../hooks/use_fetch_alerting_episodes_query';
import { useInvalidateEpisodeQueries } from '../../hooks/use_invalidate_episode_queries';
import { alertEpisodeToDataTableRecord } from '../../utils/alert_episode_to_data_table_record';
import { dataTableRecordToEpisode } from '../../utils/data_table_record_to_episode';
import {
  DEFAULT_EPISODES_TABLE_COLUMN_SETTINGS,
  DEFAULT_EPISODES_TABLE_CONFIG,
  DEFAULT_EPISODES_TABLE_SORT,
  DEFAULT_EPISODES_TABLE_VISIBLE_COLUMNS,
  type EpisodesTableColumnSettings,
} from '../../utils/episodes_table_config';
import {
  EPISODES_LIST_COLUMN_ALERT_TAGS,
  EPISODES_LIST_COLUMN_ASSIGNEES,
  EPISODES_LIST_COLUMN_SUPPRESSED,
  EPISODES_LIST_COLUMN_RULE_TAGS,
  EPISODES_LIST_COLUMN_SOURCE,
  EPISODES_LIST_ITEM_COUNT,
  EPISODES_LIST_ITEM_COUNT_CAPPED,
  EPISODES_LIST_ITEM_COUNT_CAPPED_TOOLTIP,
  EPISODES_LIST_TABLE_ARIA_LABEL,
} from '../translations';

const SUPPRESSED_COLUMN_ID = 'suppressed';

const EPISODES_TABLE_CONSUMER = 'alertingV2Alerts';

// Neither tag column is in the episodes query's `ALLOWLISTED_SORT_FIELDS`, so a sort on them
// falls back to `@timestamp` and only looks like it works.
const COLUMN_CUSTOMIZATIONS: CustomGridColumnsConfiguration = {
  tags: ({ column }: { column: EuiDataGridColumn }): EuiDataGridColumn => ({
    ...column,
    displayAsText: EPISODES_LIST_COLUMN_ALERT_TAGS,
    isSortable: false,
  }),
  rule_tags: ({ column }) => ({
    ...column,
    displayAsText: EPISODES_LIST_COLUMN_RULE_TAGS,
    isSortable: false,
  }),
  assignees: ({ column }) => ({
    ...column,
    displayAsText: EPISODES_LIST_COLUMN_ASSIGNEES,
  }),
  alerting_source: ({ column }) => ({
    ...column,
    displayAsText: EPISODES_LIST_COLUMN_SOURCE,
    isSortable: false,
  }),
  [SUPPRESSED_COLUMN_ID]: ({ column }) => ({
    ...column,
    displayAsText: EPISODES_LIST_COLUMN_SUPPRESSED,
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
const TABLE_ROW_LINE_HEIGHT = `${TABLE_ROW_LINE_HEIGHT_PX}px`;

const getTableCss = (euiTheme: EuiThemeComputed, height: CSSProperties['height']) => css`
  height: ${typeof height === 'number' ? `${height}px` : height};
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

export interface EpisodesTableServices {
  application: ApplicationStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  docLinks: DocLinksStart;
  expressions: ExpressionsStart;
  fieldFormats: FieldFormatsStart;
  http: HttpStart;
  notifications: NotificationsStart;
  overlays: OverlayStart;
  rendering: CoreStart['rendering'];
  share: SharePluginStart;
  spaces: SpacesPluginStart;
  storage: Storage;
  theme: ThemeServiceStart;
  toastNotifications: CoreStart['notifications']['toasts'];
  uiActions: UiActionsStart;
  uiSettings: IUiSettingsClient;
  unifiedDocViewer: UnifiedDocViewerStart;
  userProfile: CoreStart['userProfile'];
}

export interface EpisodesTableProps {
  services: EpisodesTableServices;

  filterState: EpisodesFilterState;
  timeRange: TimeRange;
  fetchSize?: number;

  actions?: EpisodeAction[];

  visibleColumns?: string[];
  onVisibleColumnsChange?: (visibleColumns: string[]) => void;
  sort?: EpisodesSortState;
  onSortChange?: (sort: EpisodesSortState) => void;
  rowHeight?: number;
  onRowHeightChange?: (rowHeight: number) => void;
  columnSettings?: EpisodesTableColumnSettings;
  onColumnResize?: (resize: { columnId: string; width: number | undefined }) => void;

  height?: CSSProperties['height'];
  minHeight?: number;
  maxHeight?: number;
  showLimitedResultsNotice?: boolean;

  renderAdditionalToolbarControls?: () => ReactNode;
  onRuleNameClick?: (ruleId: string, sourceRuleInfo?: { category?: string }) => void;
  getRuleDetailsHref?: (ruleId: string, isSourceRule?: boolean) => string | undefined;
  getEpisodeDetailsHref?: (episodeId: string) => string;
}

const noRuleDetailsHref = (): string | undefined => undefined;
const noEpisodeDetailsHref = (): string => '';

export const EpisodesTable = ({
  services,
  filterState,
  timeRange,
  fetchSize = ALERT_EPISODES_LIST_PAGE_SIZE,
  actions: actionsProp,
  visibleColumns: visibleColumnsProp,
  onVisibleColumnsChange,
  sort: sortProp,
  onSortChange,
  rowHeight: rowHeightProp,
  onRowHeightChange,
  columnSettings: columnSettingsProp,
  onColumnResize,
  height = '100%',
  minHeight,
  maxHeight,
  showLimitedResultsNotice = true,
  renderAdditionalToolbarControls,
  onRuleNameClick: onRuleNameClickProp,
  getRuleDetailsHref: getRuleDetailsHrefProp,
  getEpisodeDetailsHref: getEpisodeDetailsHrefProp,
}: EpisodesTableProps) => {
  const { euiTheme } = useEuiTheme();
  const ariaLabelId = useGeneratedHtmlId({ prefix: 'alertingEpisodesTable' });
  const host = useAlertHost();
  const getRuleDetailsHref = getRuleDetailsHrefProp ?? host.getRuleDetailsHref ?? noRuleDetailsHref;
  const getEpisodeDetailsHref =
    getEpisodeDetailsHrefProp ?? host.getEpisodeDetailsHref ?? noEpisodeDetailsHref;
  const invalidateEpisodeQueries = useInvalidateEpisodeQueries();

  const [visibleColumnsState, setVisibleColumnsState] = useState(
    DEFAULT_EPISODES_TABLE_VISIBLE_COLUMNS
  );
  const [sortState, setSortState] = useState<EpisodesSortState>(DEFAULT_EPISODES_TABLE_SORT);
  const [rowHeightState, setRowHeightState] = useState(
    () =>
      rowHeightProp ??
      getRowHeight({
        storage: services.storage,
        consumer: EPISODES_TABLE_CONSUMER,
        configRowHeight: DEFAULT_EPISODES_TABLE_CONFIG.rowHeight,
      })
  );
  const [columnSettingsState, setColumnSettingsState] = useState<EpisodesTableColumnSettings>(
    DEFAULT_EPISODES_TABLE_COLUMN_SETTINGS
  );

  const visibleColumns = visibleColumnsProp ?? visibleColumnsState;
  const episodesSort = sortProp ?? sortState;
  const rowHeight = rowHeightProp ?? rowHeightState;
  const columnSettings = columnSettingsProp ?? columnSettingsState;

  const setVisibleColumns = onVisibleColumnsChange ?? setVisibleColumnsState;
  const setSort = onSortChange ?? setSortState;
  const setRowHeight = onRowHeightChange ?? setRowHeightState;
  const handleColumnResize = useCallback(
    ({ columnId, width }: { columnId: string; width: number | undefined }) => {
      if (onColumnResize) {
        onColumnResize({ columnId, width });
        return;
      }
      setColumnSettingsState((prev) => ({ ...prev, [columnId]: { ...prev[columnId], width } }));
    },
    [onColumnResize]
  );

  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>();
  const closeFlyout = useCallback(() => setExpandedDoc(undefined), []);

  const { openRuleFlyout: hostOpenRuleFlyout, closeRuleFlyout: hostCloseRuleFlyout } = host;
  const onRuleNameClick = useMemo(() => {
    const open = onRuleNameClickProp ?? hostOpenRuleFlyout;
    if (!open) {
      return undefined;
    }
    return (ruleId: string, sourceRuleInfo?: { category?: string }) => {
      setExpandedDoc(undefined);
      open(ruleId, sourceRuleInfo);
    };
  }, [onRuleNameClickProp, hostOpenRuleFlyout]);

  const expandDoc = useCallback(
    (doc?: DataTableRecord) => {
      if (doc) {
        hostCloseRuleFlyout?.();
      }
      setExpandedDoc(doc);
    },
    [hostCloseRuleFlyout]
  );

  const {
    data: episodesData,
    dataView,
    isLoading,
  } = useFetchAlertingEpisodesQuery({
    pageSize: fetchSize,
    services,
    filterState,
    sortState: episodesSort,
    timeRange,
  });

  const loadedEpisodesCount = episodesData?.length ?? 0;
  const isEpisodeListCapped = showLimitedResultsNotice && loadedEpisodesCount >= fetchSize;

  const sort: SortOrder[] = useMemo(
    () => [[episodesSort.sortField, episodesSort.sortDirection]],
    [episodesSort.sortField, episodesSort.sortDirection]
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

  const { rulesCache, loading: isLoadingRules } = useAlertingRulesCache({ ruleIds, services });

  const sourceDataViewsByRule = useAlertingRuleSourceDataViews({
    rules: rulesCache,
    dataViews: services.dataViews,
    http: services.http,
  });

  const defaultActions = useEpisodeActions({
    services,
    rulesCache,
    canWriteAlerts: host.canWriteAlerts,
  });

  const actions = actionsProp ?? defaultActions;

  const tableActions = useMemo(
    () => actions.filter(({ id }) => id !== OPEN_ALERT_EVENTS_HISTORY_ACTION_ID),
    [actions]
  );

  const rows = useMemo(() => episodesData?.map(alertEpisodeToDataTableRecord), [episodesData]);

  const totalHits = useMemo(() => {
    if (!showLimitedResultsNotice) {
      return loadedEpisodesCount;
    }
    return isEpisodeListCapped ? fetchSize + 1 : loadedEpisodesCount;
  }, [showLimitedResultsNotice, isEpisodeListCapped, loadedEpisodesCount, fetchSize]);

  const resolvedHeight = useMemo(
    () =>
      resolveTableHeight({
        height,
        minHeight,
        maxHeight,
        rowHeightLines: rowHeight,
        rowCount: loadedEpisodesCount,
        defaultRowHeightLines: DEFAULT_EPISODES_TABLE_CONFIG.rowHeight,
      }),
    [height, minHeight, maxHeight, rowHeight, loadedEpisodesCount]
  );

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
                <EuiToolTip content={EPISODES_LIST_ITEM_COUNT_CAPPED_TOOLTIP(fetchSize)}>
                  <EuiText size="xs" data-test-subj="alertEpisodesItemCount" tabIndex={0}>
                    {EPISODES_LIST_ITEM_COUNT_CAPPED(fetchSize)}
                  </EuiText>
                </EuiToolTip>
              ) : (
                <EuiText size="xs" data-test-subj="alertEpisodesItemCount">
                  {EPISODES_LIST_ITEM_COUNT(loadedEpisodesCount)}
                </EuiText>
              )}
            </EuiFlexItem>
            {renderAdditionalToolbarControls ? (
              <>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    |
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>{renderAdditionalToolbarControls()}</EuiFlexItem>
              </>
            ) : null}
          </EuiFlexGroup>
        ),
      }),
    [
      euiTheme.size.s,
      fetchSize,
      isEpisodeListCapped,
      loadedEpisodesCount,
      renderAdditionalToolbarControls,
    ]
  );

  const renderDocumentView = useCallback<RenderDocumentViewCallback>(
    (hit) => {
      if (!episodeSupportsTimeline(dataTableRecordToEpisode(hit))) {
        return (
          <ClassicAlertDetailsFlyout
            alertId={hit.flattened['episode.id'] as string}
            onClose={closeFlyout}
            services={{ http: services.http }}
            actions={actions}
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
          actions={actions}
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
      actions,
      closeFlyout,
      getEpisodeDetailsHref,
      getRuleDetailsHref,
      invalidateEpisodeQueries,
      services,
    ]
  );

  const rowAdditionalLeadingControls: RowControlColumn[] = useMemo(
    () =>
      tableActions.map((action) => ({
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
    [tableActions, invalidateEpisodeQueries]
  );

  const customBulkActions = useEpisodesBulkActions({
    actions: tableActions,
    episodesData,
    onSuccess: invalidateEpisodeQueries,
  });

  const onSetColumns = useCallback(
    (cols: string[], _hideTimeCol: boolean) => {
      setVisibleColumns(cols);
    },
    [setVisibleColumns]
  );

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
          onRuleNameClick={onRuleNameClick}
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
      onRuleNameClick,
      services.userProfile,
      sourceDataViewsByRule,
    ]
  );

  return (
    <CellActionsProvider
      getTriggerCompatibleActions={services.uiActions.getTriggerCompatibleActions}
    >
      <EuiScreenReaderOnly>
        <span id={ariaLabelId}>{EPISODES_LIST_TABLE_ARIA_LABEL}</span>
      </EuiScreenReaderOnly>
      {!dataView ? (
        <EuiLoadingSpinner data-test-subj="alertingV2EpisodesListTable-loading" />
      ) : (
        <UnifiedDataTable
          ariaLabelledBy={ariaLabelId}
          consumer={EPISODES_TABLE_CONSUMER}
          settings={settings}
          css={getTableCss(euiTheme, resolvedHeight)}
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
          totalHits={totalHits}
          loadingState={isLoading ? DataLoadingState.loading : DataLoadingState.loaded}
          isPaginationEnabled
          paginationMode="singlePage"
          sampleSizeState={fetchSize}
          isSortEnabled
          sort={sort}
          onSort={onSort}
          onResize={handleColumnResize}
          rowHeightState={rowHeight}
          onUpdateRowHeight={setRowHeight}
          configRowHeight={DEFAULT_EPISODES_TABLE_CONFIG.rowHeight}
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
  );
};
