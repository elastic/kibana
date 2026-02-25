/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiInMemoryTable,
  EuiLink,
  type EuiBasicTableColumn,
  type SearchFilterConfig,
} from '@elastic/eui';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import type { RunningQuery } from '../../../common/types';
import { QueryDetailFlyout } from './query_detail_flyout';
import { RunTimeFilter } from './run_time_filter';
import { StopQueryConfirmationModal } from './stop_query_confirmation_modal';

interface RunningQueriesTableProps {
  queries: RunningQuery[];
  onCancelQuery: (taskId: string) => Promise<boolean>;
}

export const RunningQueriesTable: React.FC<RunningQueriesTableProps> = ({
  queries,
  onCancelQuery,
}) => {
  const [selectedQuery, setSelectedQuery] = useState<RunningQuery | null>(null);
  const [runTimeValue, setRunTimeValue] = useState<number | null>(null);
  const [runTimeUnit, setRunTimeUnit] = useState('m');
  const [taskIdToStop, setTaskIdToStop] = useState<string | null>(null);
  const [isStopping, setIsStopping] = useState(false);

  const closeFlyout = useCallback(() => setSelectedQuery(null), []);

  const requestStopQuery = useCallback((taskId: string) => setTaskIdToStop(taskId), []);

  const cancelStopQuery = useCallback(() => {
    if (isStopping) return;
    setTaskIdToStop(null);
  }, [isStopping]);

  const confirmStopQuery = useCallback(async () => {
    if (!taskIdToStop) return;

    setIsStopping(true);
    let didRequestStop = false;
    try {
      didRequestStop = await onCancelQuery(taskIdToStop);
    } finally {
      setIsStopping(false);
    }

    if (!didRequestStop) {
      return;
    }

    if (selectedQuery?.taskId === taskIdToStop) {
      setSelectedQuery(null);
    }

    setTaskIdToStop(null);
  }, [onCancelQuery, selectedQuery, taskIdToStop]);

  const filteredQueries = useMemo(() => {
    if (runTimeValue === null) return queries;
    const sinceMs = moment()
      .subtract(runTimeValue, runTimeUnit as moment.unitOfTime.DurationConstructor)
      .valueOf();
    return queries.filter((q) => q.startTime >= sinceMs);
  }, [queries, runTimeValue, runTimeUnit]);

  const columns: Array<EuiBasicTableColumn<RunningQuery>> = useMemo(
    () => [
      {
        field: 'taskId',
        name: i18n.translate('xpack.runningQueries.table.taskIdColumn', {
          defaultMessage: 'Task ID',
        }),
        width: '300px',
        sortable: true,
        render: (taskId: string, query: RunningQuery) => (
          <EuiLink onClick={() => setSelectedQuery(query)}>{taskId}</EuiLink>
        ),
      },
      {
        field: 'queryType',
        name: i18n.translate('xpack.runningQueries.table.queryTypeColumn', {
          defaultMessage: 'Query type',
        }),
        width: '150px',
        sortable: true,
      },
      {
        field: 'source',
        name: i18n.translate('xpack.runningQueries.table.sourceColumn', {
          defaultMessage: 'Source',
        }),
        width: '150px',
        sortable: true,
      },
      {
        field: 'startTime',
        name: i18n.translate('xpack.runningQueries.table.startTimeColumn', {
          defaultMessage: 'Start time',
        }),
        width: '220px',
        sortable: true,
        render: (startTime: number) => moment(startTime).format('MMM D YYYY, HH:mm:ss'),
      },
      {
        field: 'startTime',
        name: i18n.translate('xpack.runningQueries.table.runTimeColumn', {
          defaultMessage: 'Run time',
        }),
        sortable: true,
        render: (startTime: number) => moment(startTime).fromNow(true),
      },
      {
        name: i18n.translate('xpack.runningQueries.table.actionsColumn', {
          defaultMessage: 'Actions',
        }),
        actions: [
          {
            name: i18n.translate('xpack.runningQueries.table.cancelAction', {
              defaultMessage: 'Stop query',
            }),
            description: i18n.translate('xpack.runningQueries.table.cancelActionDescription', {
              defaultMessage: 'Stop this query',
            }),
            icon: 'crossCircle',
            type: 'icon',
            color: 'danger',
            enabled: (query: RunningQuery) => query.cancellable && !query.cancelled,
            onClick: (query: RunningQuery) => requestStopQuery(query.taskId),
          },
        ],
      },
    ],
    [requestStopQuery]
  );

  const uniqueSources = useMemo(() => [...new Set(queries.map((q) => q.source))], [queries]);
  const uniqueQueryTypes = useMemo(() => [...new Set(queries.map((q) => q.queryType))], [queries]);

  const runTimeValueRef = React.useRef(runTimeValue);
  runTimeValueRef.current = runTimeValue;
  const runTimeUnitRef = React.useRef(runTimeUnit);
  runTimeUnitRef.current = runTimeUnit;
  const handleRunTimeChange = useCallback((v: number | null, u: string) => {
    setRunTimeValue(v);
    setRunTimeUnit(u);
  }, []);
  const handleRunTimeChangeRef = React.useRef(handleRunTimeChange);
  handleRunTimeChangeRef.current = handleRunTimeChange;

  const RunTimeFilterCustom = useMemo(
    () => () =>
      (
        <RunTimeFilter
          value={runTimeValueRef.current}
          unit={runTimeUnitRef.current}
          onChange={(v, u) => handleRunTimeChangeRef.current(v, u)}
        />
      ),
    []
  );

  const searchFilters: SearchFilterConfig[] = useMemo(
    () => [
      {
        type: 'custom_component',
        component: RunTimeFilterCustom,
      },
      {
        type: 'field_value_selection',
        field: 'queryType',
        name: i18n.translate('xpack.runningQueries.table.queryTypeFilter', {
          defaultMessage: 'Query type',
        }),
        multiSelect: 'or' as const,
        options: uniqueQueryTypes.map((queryType) => ({ value: queryType, name: queryType })),
      },
      {
        type: 'field_value_selection',
        field: 'source',
        name: i18n.translate('xpack.runningQueries.table.sourceFilter', {
          defaultMessage: 'Source',
        }),
        multiSelect: 'or' as const,
        options: uniqueSources.map((source) => ({ value: source, name: source })),
      },
    ],
    [uniqueQueryTypes, uniqueSources, RunTimeFilterCustom]
  );

  return (
    <>
      <EuiInMemoryTable
        items={filteredQueries}
        columns={columns}
        search={{
          box: {
            incremental: true,
          },
          filters: searchFilters,
        }}
        noItemsMessage={i18n.translate('xpack.runningQueries.table.noItemsMessage', {
          defaultMessage: 'No long running queries detected',
        })}
        pagination={true}
        sorting={{
          sort: {
            field: 'startTime',
            direction: 'desc',
          },
        }}
      />
      {selectedQuery && (
        <QueryDetailFlyout
          query={selectedQuery}
          onClose={closeFlyout}
          onStopQuery={requestStopQuery}
        />
      )}
      {taskIdToStop && (
        <StopQueryConfirmationModal
          isLoading={isStopping}
          onCancel={cancelStopQuery}
          onConfirm={confirmStopQuery}
        />
      )}
    </>
  );
};
