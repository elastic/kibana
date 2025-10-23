/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { Criteria } from '@elastic/eui';
import { EuiBasicTable, EuiCodeBlock, EuiLink, EuiToolTip } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PLUGIN_ID } from '@kbn/fleet-plugin/common';
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import type { estypes } from '@elastic/elasticsearch';

import { useActionResults } from './use_action_results';
import { Direction } from '../../common/search_strategy';
import { useKibana } from '../common/lib/kibana';
import { API_VERSIONS } from '../../common/constants';
import { useErrorToast } from '../common/hooks/use_error_toast';

interface ActionResultsSummaryProps {
  actionId: string;
  startDate?: string;
  expirationDate?: string;
  agentIds?: string[];
  error?: string;
}

// Use Elasticsearch's native SearchHit type for result edges
type ResultEdge = estypes.SearchHit<object>;

const renderErrorMessage = (error: string) => (
  <EuiCodeBlock language="shell" fontSize="s" paddingSize="none" transparentBackground>
    {error}
  </EuiCodeBlock>
);

// CSS-in-JS styles for fixed-height scrollable table (moved outside component for performance)
const statusTableCss = {
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
    minHeight: '400px',
    maxHeight: '400px',
    overflowY: 'auto' as const,
  },
  '.euiTable tbody tr': {
    display: 'table',
    width: '100%',
    tableLayout: 'fixed' as const,
  },
};

const ActionResultsSummaryComponent: React.FC<ActionResultsSummaryProps> = ({
  actionId,
  expirationDate,
  agentIds,
  error,
  startDate,
}) => {
  const { http, application } = useKibana().services;
  const setErrorToast = useErrorToast();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20); // Match EuiBasicTable default
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
  // Note: Check both bracket notation ['agent.id'] (ECS formatted) and legacy format (agent_id)
  const currentPageAgentIds = useMemo(
    () =>
      data.edges
        .map((edge) => edge.fields?.['agent.id']?.[0] || edge.fields?.agent_id?.[0])
        .filter(Boolean) as string[],
    [data.edges]
  );

  // Bulk fetch agent details for current page using POST (avoids URL length limits)
  const { data: agentsData } = useQuery(
    ['bulkAgentDetails', currentPageAgentIds], // Use array directly for cache key
    async () => {
      if (currentPageAgentIds.length === 0) return { agents: [] };

      return http.post<{
        agents: Array<{ id: string; local_metadata?: { host?: { name?: string } } }>;
      }>('/internal/osquery/fleet_wrapper/agents/_bulk', {
        version: API_VERSIONS.internal.v1,
        body: JSON.stringify({
          agentIds: currentPageAgentIds,
        }),
      });
    },
    {
      enabled: currentPageAgentIds.length > 0,
      staleTime: 60000, // Cache for 1 minute
      onError: (err) => {
        setErrorToast(err, {
          title: i18n.translate('xpack.osquery.bulkAgentDetails.fetchError', {
            defaultMessage: 'Error while fetching agent details',
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

  // Placeholders are edges without completed_at that represent pending/non-responsive agents
  useEffect(() => {
    data.edges.forEach((edge) => {
      // Ensure fields object exists for all edges
      if (!edge.fields) {
        edge.fields = {};
      }

      if (error) {
        edge.fields['error.skipped'] = edge.fields.error = [error];
      } else if (expired && !edge.fields?.completed_at) {
        edge.fields['error.keyword'] = edge.fields.error = [
          i18n.translate('xpack.osquery.liveQueryActionResults.table.expiredErrorText', {
            defaultMessage: 'The action request timed out.',
          }),
        ];
      }
    });
  }, [data.edges, error, expired]);

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
      initialPageSize: 20,
      pageIndex,
      pageSize,
      totalItemCount: agentIds?.length ?? 0,
      pageSizeOptions: [10, 20, 50, 100],
      showPerPageOptions: true,
    }),
    [pageIndex, pageSize, agentIds?.length]
  );

  useEffect(() => {
    setIsLive(() => {
      if (!agentIds?.length || expired || error) return false;

      return data.aggregations.totalResponded !== agentIds?.length;
    });
  }, [agentIds?.length, data.aggregations.totalResponded, error, expired]);

  return (
    <div css={statusTableCss}>
      <EuiBasicTable
        loading={isLive}
        items={data.edges as ResultEdge[]}
        columns={columns}
        pagination={pagination}
        onChange={onTableChange}
        tableLayout="auto"
      />
    </div>
  );
};

export const ActionResultsSummary = React.memo(ActionResultsSummaryComponent);
