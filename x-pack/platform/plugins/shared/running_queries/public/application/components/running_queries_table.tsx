/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLink,
  EuiLoadingSpinner,
  EuiText,
  EuiTextColor,
  type EuiBasicTableColumn,
  type SearchFilterConfig,
} from '@elastic/eui';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import type { RunningQuery } from '../../../common/types';
import { useRunningQueriesAppContext } from '../app_context';
import { QueryDetailFlyout } from './query_detail_flyout';
import { RunTimeFilter } from './run_time_filter';
import { StopQueryConfirmationModal } from './stop_query_confirmation_modal';
import {
  getStopRequestedTaskIds,
  markStopRequestedTask,
  pruneStopRequestedTasks,
} from '../../lib/stop_requested_tasks_storage';

interface RunningQueriesTableProps {
  queries: RunningQuery[];
  onCancelQuery: (taskId: string) => Promise<boolean>;
}

type TableRunningQuery = RunningQuery & { sourceDisplay: string; sourceAvailable: boolean };

export const notAvailableLabel = i18n.translate('xpack.runningQueries.table.notAvailableLabel', {
  defaultMessage: 'Not available',
});

export const RunningQueriesTable: React.FC<RunningQueriesTableProps> = ({
  queries,
  onCancelQuery,
}) => {
  const { capabilities } = useRunningQueriesAppContext();
  const canCancelTasks = capabilities.canCancelTasks;
  const tableCaption = i18n.translate('xpack.runningQueries.table.caption', {
    defaultMessage: 'Long running queries',
  });

  const [selectedQuery, setSelectedQuery] = useState<RunningQuery | null>(null);
  const [runTimeValue, setRunTimeValue] = useState<number | null>(null);
  const [runTimeUnit, setRunTimeUnit] = useState('m');
  const [taskIdToStop, setTaskIdToStop] = useState<string | null>(null);
  const [isStopping, setIsStopping] = useState(false);
  const [stopRequestedRevision, setStopRequestedRevision] = useState(0);

  const closeFlyout = useCallback(() => setSelectedQuery(null), []);

  const requestStopQuery = useCallback((taskId: string) => setTaskIdToStop(taskId), []);

  const validTaskIds = useMemo(() => new Set(queries.map((q) => q.taskId)), [queries]);

  const stopRequestedTaskIds = useMemo(() => {
    void stopRequestedRevision;
    return getStopRequestedTaskIds({ validTaskIds });
  }, [validTaskIds, stopRequestedRevision]);

  useEffect(() => {
    pruneStopRequestedTasks({ validTaskIds });
  }, [validTaskIds, stopRequestedRevision]);

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

    markStopRequestedTask(taskIdToStop);
    setStopRequestedRevision((r) => r + 1);

    if (selectedQuery?.taskId === taskIdToStop) {
      setSelectedQuery(null);
    }

    setTaskIdToStop(null);
  }, [onCancelQuery, selectedQuery, taskIdToStop]);

  const queriesWithSourceDisplay: TableRunningQuery[] = useMemo(
    () =>
      queries.map((q) => {
        const source = q.source.trim();
        return {
          ...q,
          sourceDisplay: source.length > 0 ? source : notAvailableLabel,
          sourceAvailable: source.length > 0,
        };
      }),
    [queries]
  );

  const filteredQueries = useMemo(() => {
    if (runTimeValue === null) return queriesWithSourceDisplay;
    const sinceMs = moment()
      .subtract(runTimeValue, runTimeUnit as moment.unitOfTime.DurationConstructor)
      .valueOf();
    return queriesWithSourceDisplay.filter((q) => q.startTime <= sinceMs);
  }, [queriesWithSourceDisplay, runTimeValue, runTimeUnit]);

  const columns: Array<EuiBasicTableColumn<TableRunningQuery>> = useMemo(
    () => [
      {
        field: 'taskId',
        name: i18n.translate('xpack.runningQueries.table.taskIdColumn', {
          defaultMessage: 'Task ID',
        }),
        width: '300px',
        sortable: true,
        render: (taskId: string, query: TableRunningQuery) => (
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
        field: 'sourceDisplay',
        name: i18n.translate('xpack.runningQueries.table.sourceColumn', {
          defaultMessage: 'Source',
        }),
        width: '150px',
        sortable: true,
        render: (source: string, query: TableRunningQuery) =>
          query.sourceAvailable ? (
            source
          ) : (
            <EuiTextColor color="subdued">
              <em>{source}</em>
            </EuiTextColor>
          ),
      },
      {
        field: 'startTime',
        name: i18n.translate('xpack.runningQueries.table.startTimeColumn', {
          defaultMessage: 'Start time',
        }),
        width: '220px',
        sortable: true,
        truncateText: true,
        render: (startTime: number) => moment(startTime).format('MMM D YYYY, HH:mm:ss'),
      },
      {
        field: 'startTime',
        name: i18n.translate('xpack.runningQueries.table.runTimeColumn', {
          defaultMessage: 'Run time',
        }),
        width: '140px',
        sortable: true,
        truncateText: true,
        render: (startTime: number) => moment(startTime).fromNow(true),
      },
      {
        name: i18n.translate('xpack.runningQueries.table.actionsColumn', {
          defaultMessage: 'Actions',
        }),
        width: '240px',
        align: 'right',
        render: (value: unknown, record?: TableRunningQuery) => {
          const query = (record ?? value) as TableRunningQuery | undefined;
          if (!query) return null;

          if (stopRequestedTaskIds.has(query.taskId)) {
            return (
              <EuiFlexGroup
                gutterSize="s"
                alignItems="center"
                justifyContent="flexEnd"
                responsive={false}
              >
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="m" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s" color="subdued">
                    {i18n.translate('xpack.runningQueries.table.stoppingQueryText', {
                      defaultMessage: 'Stopping the query…',
                    })}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            );
          }

          if (!query.cancellable || query.cancelled) {
            return null;
          }

          if (!canCancelTasks) {
            return null;
          }

          return (
            <EuiButtonIcon
              aria-label={i18n.translate('xpack.runningQueries.table.stopQueryAriaLabel', {
                defaultMessage: 'Stop query',
              })}
              iconType="crossCircle"
              color="danger"
              onClick={() => requestStopQuery(query.taskId)}
            />
          );
        },
      },
    ],
    [canCancelTasks, requestStopQuery, stopRequestedTaskIds]
  );

  const uniqueSources = useMemo(
    () => [...new Set(queriesWithSourceDisplay.map((q) => q.sourceDisplay))],
    [queriesWithSourceDisplay]
  );
  const uniqueQueryTypes = useMemo(
    () => [...new Set(queries.map((q) => q.queryType).filter((s) => s.trim().length > 0))],
    [queries]
  );

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
        field: 'sourceDisplay',
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
        tableCaption={tableCaption}
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
          isStopRequested={stopRequestedTaskIds.has(selectedQuery.taskId)}
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
