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
import { useQuery } from '@kbn/react-query';
import { PLUGIN_ID } from '@kbn/fleet-plugin/common';
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import type { estypes } from '@elastic/elasticsearch';

import { useActionResults } from './use_action_results';
import { Direction } from '../../common/search_strategy';
import { useKibana } from '../common/lib/kibana';
import { API_VERSIONS } from '../../common/constants';
import { useErrorToast } from '../common/hooks/use_error_toast';
import { getAgentIdFromFields } from '../../common/utils/agent_fields';

interface ActionResultsSummaryProps {
  actionId: string;
  startDate?: string;
  expirationDate?: string;
  agentIds?: string[];
  error?: string;
}

// Use Elasticsearch's native SearchHit type for result edges
type ResultEdge = estypes.SearchHit<object>;

const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_PAGE_INDEX = 0;
const AGENT_DETAILS_CACHE_TIME_MS = 30000;
const TABLE_MAX_HEIGHT_PX = 500;
const ESTIMATED_ROW_HEIGHT_PX = 41; // EUI table row default height
const BULK_AGENT_DETAILS_ROUTE = '/internal/osquery/fleet_wrapper/agents/_bulk';

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

  const minHeight =
    expectedItemsOnPage > 0
      ? Math.min(expectedItemsOnPage * ESTIMATED_ROW_HEIGHT_PX, TABLE_MAX_HEIGHT_PX)
      : 0;

  return minHeight;
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
});

const ActionResultsSummaryComponent: React.FC<ActionResultsSummaryProps> = ({
  actionId,
  expirationDate,
  agentIds,
  error,
  startDate,
}) => {
  const { http, application } = useKibana().services;
  const setErrorToast = useErrorToast();
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
  });

  // Extract agent IDs from current page edges
  // Note: Supports both ECS formatted ['agent.id'] and legacy format (agent_id)
  const currentPageAgentIds = useMemo(
    () => data.edges.map((edge) => getAgentIdFromFields(edge.fields)).filter(Boolean) as string[],
    [data.edges]
  );

  // Bulk fetch agent details for current page using POST (avoids URL length limits)
  const { data: agentsData } = useQuery(
    ['bulkAgentDetails', currentPageAgentIds],
    async () => {
      if (currentPageAgentIds.length === 0) return { agents: [] };

      return http.post<{
        agents: Array<{ id: string; local_metadata?: { host?: { name?: string } } }>;
      }>(BULK_AGENT_DETAILS_ROUTE, {
        version: API_VERSIONS.internal.v1,
        body: JSON.stringify({
          agentIds: currentPageAgentIds,
        }),
      });
    },
    {
      enabled: currentPageAgentIds.length > 0,
      staleTime: AGENT_DETAILS_CACHE_TIME_MS,
      onError: (err) => {
        setErrorToast(err, {
          title: i18n.translate('xpack.osquery.bulkAgentDetails.fetchError', {
            defaultMessage: 'Error fetching agent details',
          }),
          toastMessage: i18n.translate('xpack.osquery.bulkAgentDetails.fetchErrorMessage', {
            defaultMessage:
              'Failed to load agent names. Please check your network connection and try again.',
          }),
        });
      },
    }
  );

  // Create agent ID to name map
  const agentNameMap = useMemo(() => {
    const map = new Map<string, string>();
    agentsData?.agents?.forEach((agent) => {
      const hostname = agent.local_metadata?.host?.name || agent.id;
      map.set(agent.id, hostname);
    });

    return map;
  }, [agentsData]);

  // Enrich edges with error states immutably
  const enrichedEdges = useMemo(
    () =>
      data.edges.map((edge) => {
        // If edge already has error/completed state, return as-is
        if (edge.fields?.error || edge.fields?.['error.skipped'] || edge.fields?.completed_at) {
          return edge;
        }

        // Create new edge with error fields if needed
        const fields = { ...(edge.fields || {}) };

        if (error) {
          fields['error.skipped'] = [error];
          fields.error = [error];
        } else if (expired && !edge.fields?.completed_at) {
          const expiredMessage = i18n.translate(
            'xpack.osquery.liveQueryActionResults.table.expiredErrorText',
            {
              defaultMessage: 'The action request timed out.',
            }
          );
          fields['error.keyword'] = [expiredMessage];
          fields.error = [expiredMessage];
        }

        return { ...edge, fields };
      }),
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
    (_: unknown, item: ResultEdge) => {
      if (item.fields?.['error.skipped']) {
        return i18n.translate('xpack.osquery.liveQueryActionResults.table.skippedStatusText', {
          defaultMessage: 'skipped',
        });
      }

      if (!item.fields?.completed_at) {
        return expired
          ? i18n.translate('xpack.osquery.liveQueryActionResults.table.expiredStatusText', {
              defaultMessage: 'expired',
            })
          : i18n.translate('xpack.osquery.liveQueryActionResults.table.pendingStatusText', {
              defaultMessage: 'pending',
            });
      }

      if (item.fields?.['error.keyword']) {
        return i18n.translate('xpack.osquery.liveQueryActionResults.table.errorStatusText', {
          defaultMessage: 'error',
        });
      }

      return i18n.translate('xpack.osquery.liveQueryActionResults.table.successStatusText', {
        defaultMessage: 'success',
      });
    },
    [expired]
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
    // Only update if agentIds length hasn't changed during render (prevents race conditions)
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

export const ActionResultsSummary = React.memo(ActionResultsSummaryComponent);
