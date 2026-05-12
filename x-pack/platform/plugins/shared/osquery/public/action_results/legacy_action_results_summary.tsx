/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { Criteria } from '@elastic/eui';
import { EuiBasicTable, EuiCodeBlock, EuiLink, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PLUGIN_ID } from '@kbn/fleet-plugin/common';
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import type { estypes } from '@elastic/elasticsearch';

import { useActionResults } from './use_action_results';
import { Direction } from '../../common/search_strategy';
import { useKibana } from '../common/lib/kibana';
import { getAgentIdFromFields } from '../../common/utils/agent_fields';
import { useBulkAgentDetails } from './use_bulk_agent_details';
import { enrichEdgesWithErrors } from './enrich_edges';
import { computeStatus } from './transform_status_results';

export interface ActionResultsSummaryProps {
  actionId: string;
  startDate?: string;
  expirationDate?: string;
  agentIds?: string[];
  error?: string;
  scheduleId?: string;
  executionCount?: number;
}

// Use Elasticsearch's native SearchHit type for result edges
type ResultEdge = estypes.SearchHit<object>;

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_PAGE_INDEX = 0;
const TABLE_MAX_HEIGHT_PX = 500;
const ESTIMATED_ROW_HEIGHT_PX = 41; // EUI table row default height

const renderErrorMessage = (error: string) => (
  <EuiCodeBlock language="shell" fontSize="s" paddingSize="none" transparentBackground>
    {error}
  </EuiCodeBlock>
);

// Calculate minimum table body height based on expected rows on current page
const calculateMinTableBodyHeight = (
  pageSize: number,
  pageIndex: number,
  totalItemCount: number
): number => {
  const expectedItemsOnPage = Math.min(
    pageSize,
    Math.max(0, totalItemCount - pageIndex * pageSize)
  );

  return expectedItemsOnPage > 0
    ? Math.min(expectedItemsOnPage * ESTIMATED_ROW_HEIGHT_PX, TABLE_MAX_HEIGHT_PX)
    : 0;
};

// CSS-in-JS styles for scrollable table with dynamic height
const createStatusTableCss = (pageSize: number, pageIndex: number, totalItemCount: number) => ({
  '.euiTable': {
    display: 'block',
  },
  '.euiTable thead': {
    display: 'table',
    width: '100%',
    tableLayout: 'fixed' as const,
  },
  '.euiTable tbody': {
    display: 'block',
    minHeight: `${calculateMinTableBodyHeight(pageSize, pageIndex, totalItemCount)}px`,
    maxHeight: `${TABLE_MAX_HEIGHT_PX}px`,
    overflowY: 'auto' as const,
  },
  '.euiTable tbody tr': {
    display: 'table',
    width: '100%',
    tableLayout: 'fixed' as const,
  },
  '.euiTable th:first-child, .euiTable td:first-child': {
    paddingLeft: '8px',
  },
});

const LegacyActionResultsSummaryComponent: React.FC<ActionResultsSummaryProps> = ({
  actionId,
  expirationDate,
  agentIds,
  error,
  startDate,
  scheduleId,
  executionCount,
}) => {
  const { application } = useKibana().services;
  const [pageIndex, setPageIndex] = useState(DEFAULT_PAGE_INDEX);
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

  // Extract agent IDs from current page edges
  const currentPageAgentIds = useMemo(
    () => data.edges.map((edge) => getAgentIdFromFields(edge.fields)).filter(Boolean) as string[],
    [data.edges]
  );

  const { agentNameMap } = useBulkAgentDetails(currentPageAgentIds);

  const enrichedEdges = useMemo(
    () => enrichEdgesWithErrors(data.edges, error, expired),
    [data.edges, error, expired]
  );

  const renderAgentIdColumn = useCallback(
    (agentId: string) => {
      const agentName = agentNameMap.get(agentId) || agentId;

      return (
        <EuiToolTip position="top" content={<p>{agentId}</p>}>
          <EuiLink
            className="eui-textTruncate"
            href={application.getUrlForApp(PLUGIN_ID, {
              path: pagePathGetters.agent_details({ agentId })[1],
            })}
            target="_blank"
          >
            {agentName}
          </EuiLink>
        </EuiToolTip>
      );
    },
    [agentNameMap, application]
  );
  const renderRowsColumn = useCallback((rowsCount: number | undefined) => rowsCount ?? '-', []);
  const renderStatusColumn = useCallback(
    (_: unknown, item: ResultEdge) => computeStatus(item, expired, error),
    [expired, error]
  );

  const columns = useMemo(
    () => [
      {
        field: 'status',
        name: i18n.translate('xpack.osquery.liveQueryActionResults.table.statusColumnTitle', {
          defaultMessage: 'Status',
        }),
        render: renderStatusColumn,
      },
      {
        field: 'fields.agent_id[0]',
        name: i18n.translate('xpack.osquery.liveQueryActionResults.table.agentIdColumnTitle', {
          defaultMessage: 'Agent Id',
        }),
        truncateText: true,
        render: renderAgentIdColumn,
      },
      {
        field: '_source.action_response.osquery.count',
        name: i18n.translate(
          'xpack.osquery.liveQueryActionResults.table.resultRowsNumberColumnTitle',
          {
            defaultMessage: 'Number of result rows',
          }
        ),
        render: renderRowsColumn,
      },
      {
        field: 'fields.error[0]',
        name: i18n.translate('xpack.osquery.liveQueryActionResults.table.errorColumnTitle', {
          defaultMessage: 'Error',
        }),
        render: renderErrorMessage,
      },
    ],
    [renderAgentIdColumn, renderRowsColumn, renderStatusColumn]
  );

  const onTableChange = useCallback(({ page }: Criteria<ResultEdge>) => {
    if (page) {
      setPageIndex(page.index);
      setPageSize(page.size);
    }
  }, []);

  const pagination = useMemo(
    () => ({
      initialPageSize: DEFAULT_PAGE_SIZE,
      pageIndex,
      pageSize,
      totalItemCount: agentIds?.length ?? 0,
      pageSizeOptions: [10, 20, 50, 100],
      showPerPageOptions: true,
    }),
    [pageIndex, pageSize, agentIds?.length]
  );

  const statusTableCss = useMemo(
    () => createStatusTableCss(pageSize, pageIndex, agentIds?.length ?? 0),
    [pageSize, pageIndex, agentIds?.length]
  );

  // Guard against race conditions when updating isLive
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

  return (
    <div css={statusTableCss}>
      <EuiBasicTable
        loading={isLive}
        items={enrichedEdges as ResultEdge[]}
        columns={columns}
        pagination={pagination}
        onChange={onTableChange}
        tableCaption={i18n.translate(
          'xpack.osquery.liveQueryActionResults.table.liveActionResultsCaption',
          {
            defaultMessage: 'Live action results',
          }
        )}
        tableLayout="auto"
      />
    </div>
  );
};

export const LegacyActionResultsSummary = React.memo(LegacyActionResultsSummaryComponent);
