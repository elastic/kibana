/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EuiProgress, EuiTablePagination, useEuiTheme } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PLUGIN_ID } from '@kbn/fleet-plugin/common';
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { UnifiedDataTable, DataLoadingState, DataGridDensity } from '@kbn/unified-data-table';
import { CellActionsProvider } from '@kbn/cell-actions';
import { useActionResults } from './use_action_results';
import { Direction } from '../../common/search_strategy';
import { useKibana } from '../common/lib/kibana';
import { getAgentIdFromFields } from '../../common/utils/agent_fields';
import { PLUGIN_NAME as OSQUERY_PLUGIN_NAME } from '../../common';
import { useActionResultsDataView } from './use_action_results_data_view';
import { transformStatusEdgesToRecords } from './transform_status_results';
import { getStatusCellRenderers } from './status_cell_renderers';
import { euiProgressCss } from '../results/results_table_shared';
import { useBulkAgentDetails } from './use_bulk_agent_details';
import { enrichEdgesWithErrors } from './enrich_edges';
import type { ActionResultsSummaryProps } from './legacy_action_results_summary';

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const DEFAULT_COLUMNS = ['status', 'agent_id', 'action_response.osquery.count', 'error'];

const COLUMN_DISPLAY_SETTINGS = {
  columns: {
    status: {
      display: i18n.translate('xpack.osquery.liveQueryActionResults.table.statusColumnTitle', {
        defaultMessage: 'Status',
      }),
    },
    agent_id: {
      display: i18n.translate('xpack.osquery.liveQueryActionResults.table.agentIdColumnTitle', {
        defaultMessage: 'Agent Id',
      }),
    },
    'action_response.osquery.count': {
      display: i18n.translate(
        'xpack.osquery.liveQueryActionResults.table.resultRowsNumberColumnTitle',
        { defaultMessage: 'Number of result rows' }
      ),
    },
    error: {
      display: i18n.translate('xpack.osquery.liveQueryActionResults.table.errorColumnTitle', {
        defaultMessage: 'Error',
      }),
    },
  },
};

const STATUS_COLUMNS_META = {
  'action_response.osquery.count': { type: 'number' as const },
};

let storageInstance: Storage;
const getStorage = () => {
  if (!storageInstance) {
    storageInstance = new Storage(localStorage);
  }

  return storageInstance;
};

const statusTableContainerCss = {
  width: '100%',
  display: 'flex' as const,
  flexDirection: 'column' as const,
  flex: '1 1 auto',
  minHeight: 0,
};

const unifiedTableWrapperCss = {
  flex: '1 1 auto',
  minHeight: 200,
};

const gridStyleOverride = {
  border: 'all' as const,
  header: 'underline' as const,
  stripes: false,
};

const EMPTY_SORT: [] = [];
const EMPTY_CONTROL_COLUMN_IDS: string[] = [];
const noop = () => {};

const UnifiedActionResultsSummaryComponent: React.FC<ActionResultsSummaryProps> = ({
  actionId,
  expirationDate,
  agentIds,
  error,
  startDate,
  scheduleId,
  executionCount,
}) => {
  const {
    application: { getUrlForApp },
    appName,
    theme,
    uiSettings,
    notifications: { toasts },
    data: dataService,
    uiActions: uiActionsService,
  } = useKibana().services;

  const uiActions = uiActionsService!;
  const { euiTheme } = useEuiTheme();

  const tableWrapperCss = useMemo(
    () => [
      unifiedTableWrapperCss,
      {
        '.euiDataGridHeaderCell': {
          backgroundColor: euiTheme.colors.lightestShade,
        },
      },
    ],
    [euiTheme.colors.lightestShade]
  );

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const expired = useMemo(
    () => (!expirationDate ? false : new Date(expirationDate) < new Date()),
    [expirationDate]
  );
  const [isLive, setIsLive] = useState(true);

  const { data } = useActionResults({
    actionId,
    startDate,
    activePage: pageIndex,
    agentIds,
    limit: pageSize,
    direction: Direction.asc,
    sortField: '@timestamp',
    isLive,
    scheduleId,
    executionCount,
  });

  const currentPageAgentIds = useMemo(
    () => data.edges.map((edge) => getAgentIdFromFields(edge.fields)).filter(Boolean) as string[],
    [data.edges]
  );

  const { agentNameMap } = useBulkAgentDetails(currentPageAgentIds);

  const enrichedEdges = useMemo(
    () => enrichEdgesWithErrors(data.edges, error, expired),
    [data.edges, error, expired]
  );

  const dataView = useActionResultsDataView();
  const unifiedDataTableServices = useMemo(
    () => ({
      theme,
      fieldFormats: dataService.fieldFormats,
      uiSettings,
      toastNotifications: toasts,
      storage: getStorage(),
      data: dataService,
    }),
    [dataService, theme, toasts, uiSettings]
  );

  // Transform edges to DataTableRecords
  const rows = useMemo(
    () =>
      transformStatusEdgesToRecords({
        edges: enrichedEdges,
        agentNameMap,
        expired,
        error,
      }),
    [enrichedEdges, agentNameMap, expired, error]
  );

  const getFleetAppUrl = useCallback(
    (agentId: string) =>
      getUrlForApp(PLUGIN_ID, {
        path: pagePathGetters.agent_details({ agentId })[1],
      }),
    [getUrlForApp]
  );

  const externalCustomRenderers = useMemo(
    () => getStatusCellRenderers({ getFleetAppUrl }),
    [getFleetAppUrl]
  );

  // Pagination
  const totalItemCount = agentIds?.length ?? 0;
  const totalPages = Math.ceil(totalItemCount / pageSize);

  const handlePageChange = useCallback((newPageIndex: number) => {
    setPageIndex(newPageIndex);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPageIndex(0);
  }, []);

  // Live polling control
  const currentAgentCountRef = useRef(agentIds?.length);

  useEffect(() => {
    if (currentAgentCountRef.current === agentIds?.length) {
      setIsLive(() => {
        if (!agentIds?.length || expired || error) return false;

        return data.aggregations.totalResponded !== agentIds?.length;
      });
    }

    currentAgentCountRef.current = agentIds?.length;
  }, [agentIds?.length, data.aggregations.totalResponded, error, expired]);

  if (!dataView) {
    return null;
  }

  return (
    <>
      {isLive && <EuiProgress color="primary" size="xs" css={euiProgressCss} />}

      <div css={statusTableContainerCss}>
        <div css={tableWrapperCss} data-test-subj="osqueryStatusTable">
          <CellActionsProvider getTriggerCompatibleActions={uiActions.getTriggerCompatibleActions}>
            <UnifiedDataTable
              ariaLabelledBy="osquery-status-results"
              dataView={dataView}
              columns={DEFAULT_COLUMNS}
              rows={rows}
              loadingState={isLive ? DataLoadingState.loading : DataLoadingState.loaded}
              externalCustomRenderers={externalCustomRenderers}
              sort={EMPTY_SORT}
              showTimeCol={false}
              showFullScreenButton={appName === OSQUERY_PLUGIN_NAME}
              canDragAndDropColumns={false}
              isSortEnabled={false}
              isPaginationEnabled={false}
              sampleSizeState={rows.length}
              totalHits={totalItemCount}
              services={unifiedDataTableServices}
              consumer="osquery"
              columnsMeta={STATUS_COLUMNS_META}
              showColumnTokens={false}
              settings={COLUMN_DISPLAY_SETTINGS}
              onSetColumns={noop}
              controlColumnIds={EMPTY_CONTROL_COLUMN_IDS}
              gridStyleOverride={gridStyleOverride}
              dataGridDensityState={DataGridDensity.EXPANDED}
            />
          </CellActionsProvider>
        </div>

        <EuiTablePagination
          pageCount={totalPages}
          activePage={pageIndex}
          onChangePage={handlePageChange}
          itemsPerPage={pageSize}
          onChangeItemsPerPage={handlePageSizeChange}
          itemsPerPageOptions={PAGE_SIZE_OPTIONS}
          showPerPageOptions
        />
      </div>
    </>
  );
};

export const UnifiedActionResultsSummary = React.memo(UnifiedActionResultsSummaryComponent);
