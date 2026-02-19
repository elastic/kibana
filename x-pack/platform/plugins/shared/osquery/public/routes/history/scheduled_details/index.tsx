/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSpacer,
  EuiCodeBlock,
  EuiStat,
  EuiBadge,
  EuiSkeletonText,
  EuiBasicTable,
  EuiDataGrid,
  formatDate,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';

import { useRouterNavigate } from '../../../common/lib/kibana';
import { WithHeaderLayout } from '../../../components/layouts';
import { useScheduledExecutionDetails } from '../../../actions/use_scheduled_execution_details';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';

interface ResultRow {
  _source: Record<string, unknown>;
}

const ScheduledExecutionDetailsPageComponent = () => {
  const { scheduleId, executionCount } = useParams<{
    scheduleId: string;
    executionCount: string;
  }>();
  useBreadcrumbs('history_details', { liveQueryId: scheduleId });
  const historyListProps = useRouterNavigate('history');

  const { data, isLoading } = useScheduledExecutionDetails({
    scheduleId,
    executionCount: Number(executionCount),
  });

  console.log({ data });
  // Extract columns and rows from result documents
  const { resultColumns, resultRows } = useMemo(() => {
    const results = (data?.results ?? []) as ResultRow[];
    if (results.length === 0) {
      return { resultColumns: [], resultRows: [] };
    }

    // Collect all unique field names from osquery results (under _source.osquery.*)
    const columnSet = new Set<string>();
    const rows: Array<Record<string, string>> = [];

    for (const hit of results) {
      const source = hit._source ?? {};
      const osqueryData = (source.osquery ?? {}) as Record<string, unknown>;

      for (const key of Object.keys(osqueryData)) {
        columnSet.add(key);
      }

      rows.push(
        Object.fromEntries(Object.entries(osqueryData).map(([k, v]) => [k, String(v ?? '')]))
      );
    }

    const columns = Array.from(columnSet)
      .sort()
      .map((col) => ({
        id: col,
        displayAsText: col,
      }));

    return { resultColumns: columns, resultRows: rows };
  }, [data?.results]);

  // EuiDataGrid pagination
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
  const onChangePage = useCallback(
    (pageIndex: number) => setPagination((prev) => ({ ...prev, pageIndex })),
    []
  );
  const onChangeItemsPerPage = useCallback(
    (pageSize: number) => setPagination({ pageIndex: 0, pageSize }),
    []
  );

  // EuiDataGrid visible columns
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const actualVisibleColumns = useMemo(
    () => (visibleColumns.length > 0 ? visibleColumns : resultColumns.map((c) => c.id)),
    [visibleColumns, resultColumns]
  );

  // EuiDataGrid cell rendering
  const renderCellValue = useCallback(
    ({ rowIndex, columnId }: { rowIndex: number; columnId: string }) => {
      const row = resultRows[rowIndex];

      return row?.[columnId] ?? '-';
    },
    [resultRows]
  );

  const responseColumns = useMemo(
    () => [
      {
        field: '_source.agent_id',
        name: i18n.translate('xpack.osquery.scheduledExecutionDetails.agentIdColumn', {
          defaultMessage: 'Agent ID',
        }),
        width: '200px',
      },
      {
        field: '_source.@timestamp',
        name: i18n.translate('xpack.osquery.scheduledExecutionDetails.timestampColumn', {
          defaultMessage: 'Timestamp',
        }),
        width: '200px',
        render: (timestamp: string) => <>{formatDate(timestamp)}</>,
      },
      {
        field: '_source.action_response.osquery.count',
        name: i18n.translate('xpack.osquery.scheduledExecutionDetails.rowCountColumn', {
          defaultMessage: 'Rows',
        }),
        width: '80px',
      },
      {
        field: '_source.error',
        name: i18n.translate('xpack.osquery.scheduledExecutionDetails.errorColumn', {
          defaultMessage: 'Error',
        }),
        render: (error: string | undefined) =>
          error ? <EuiBadge color="danger">{error}</EuiBadge> : '-',
      },
    ],
    []
  );

  const LeftColumn = useMemo(
    () => (
      <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiButtonEmpty iconType="arrowLeft" {...historyListProps} flush="left" size="xs">
            <FormattedMessage
              id="xpack.osquery.scheduledExecutionDetails.viewHistoryTitle"
              defaultMessage="View history"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
            <h1>
              <FormattedMessage
                id="xpack.osquery.scheduledExecutionDetails.pageTitle"
                defaultMessage="Scheduled execution details"
              />
            </h1>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [historyListProps]
  );

  if (isLoading) {
    return (
      <WithHeaderLayout leftColumn={LeftColumn} rightColumnGrow={false}>
        <EuiSkeletonText lines={10} />
      </WithHeaderLayout>
    );
  }

  return (
    <WithHeaderLayout leftColumn={LeftColumn} rightColumnGrow={false}>
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="l" alignItems="center">
            {data?.packName && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow" iconType="package">
                  {data.packName}
                </EuiBadge>
              </EuiFlexItem>
            )}
            {data?.timestamp && (
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  {formatDate(data.timestamp)}
                </EuiText>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued">
                <FormattedMessage
                  id="xpack.osquery.scheduledExecutionDetails.executionCountLabel"
                  defaultMessage="Execution #{count}"
                  values={{ count: executionCount }}
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {data?.queryText && (
          <EuiFlexItem>
            <EuiCodeBlock language="sql" fontSize="m" paddingSize="m" isCopyable>
              {data.queryText}
            </EuiCodeBlock>
          </EuiFlexItem>
        )}

        <EuiFlexItem>
          <EuiFlexGroup gutterSize="xl">
            <EuiFlexItem grow={false}>
              <EuiStat
                title={data?.agentCount ?? 0}
                description={i18n.translate(
                  'xpack.osquery.scheduledExecutionDetails.agentsRespondedLabel',
                  { defaultMessage: 'Agents responded' }
                )}
                titleSize="s"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiStat
                title={data?.successCount ?? 0}
                description={i18n.translate(
                  'xpack.osquery.scheduledExecutionDetails.successLabel',
                  { defaultMessage: 'Successful' }
                )}
                titleSize="s"
                titleColor="success"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiStat
                title={data?.errorCount ?? 0}
                description={i18n.translate('xpack.osquery.scheduledExecutionDetails.errorsLabel', {
                  defaultMessage: 'Errors',
                })}
                titleSize="s"
                titleColor="danger"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiStat
                title={data?.totalRows ?? 0}
                description={i18n.translate(
                  'xpack.osquery.scheduledExecutionDetails.totalRowsLabel',
                  { defaultMessage: 'Total rows' }
                )}
                titleSize="s"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiSpacer size="m" />
          <EuiText>
            <h3>
              <FormattedMessage
                id="xpack.osquery.scheduledExecutionDetails.agentResponsesTitle"
                defaultMessage="Agent responses"
              />
            </h3>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiBasicTable
            items={data?.responses ?? []}
            columns={responseColumns}
            data-test-subj="scheduledExecutionResponsesTable"
          />
        </EuiFlexItem>

        {resultColumns.length > 0 && (
          <EuiFlexItem>
            <EuiSpacer size="m" />
            <EuiText>
              <h3>
                <FormattedMessage
                  id="xpack.osquery.scheduledExecutionDetails.resultsTitle"
                  defaultMessage="Results"
                />
              </h3>
            </EuiText>
            <EuiSpacer size="s" />
            {'test'}
            <EuiDataGrid
              aria-label="Scheduled execution results"
              columns={resultColumns}
              columnVisibility={{
                visibleColumns: actualVisibleColumns,
                setVisibleColumns,
              }}
              rowCount={resultRows.length}
              renderCellValue={renderCellValue}
              pagination={{
                ...pagination,
                pageSizeOptions: [25, 50, 100],
                onChangePage,
                onChangeItemsPerPage,
              }}
              toolbarVisibility={{
                showColumnSelector: true,
                showSortSelector: true,
                showFullScreenSelector: true,
              }}
              data-test-subj="scheduledExecutionResultsGrid"
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </WithHeaderLayout>
  );
};

export const ScheduledExecutionDetailsPage = React.memo(ScheduledExecutionDetailsPageComponent);
