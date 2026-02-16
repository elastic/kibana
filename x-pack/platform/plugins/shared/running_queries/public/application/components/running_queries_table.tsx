/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiInMemoryTable, type EuiBasicTableColumn, type SearchFilterConfig } from '@elastic/eui';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import type { RunningQuery } from '../../../common/types';

interface RunningQueriesTableProps {
  queries: RunningQuery[];
  onCancelQuery: (taskId: string) => void;
}

export const RunningQueriesTable: React.FC<RunningQueriesTableProps> = ({
  queries,
  onCancelQuery,
}) => {
  const columns: Array<EuiBasicTableColumn<RunningQuery>> = useMemo(
    () => [
      {
        field: 'taskId',
        name: i18n.translate('xpack.runningQueries.table.taskIdColumn', {
          defaultMessage: 'Task ID',
        }),
        sortable: true,
      },
      {
        field: 'queryType',
        name: i18n.translate('xpack.runningQueries.table.queryTypeColumn', {
          defaultMessage: 'Query type',
        }),
        sortable: true,
      },
      {
        field: 'source',
        name: i18n.translate('xpack.runningQueries.table.sourceColumn', {
          defaultMessage: 'Source',
        }),
        sortable: true,
      },
      {
        field: 'startTime',
        name: i18n.translate('xpack.runningQueries.table.startTimeColumn', {
          defaultMessage: 'Start time',
        }),
        sortable: true,
        render: (startTime: number) => moment(startTime).fromNow(),
      },
      {
        name: i18n.translate('xpack.runningQueries.table.actionsColumn', {
          defaultMessage: 'Actions',
        }),
        actions: [
          {
            name: i18n.translate('xpack.runningQueries.table.cancelAction', {
              defaultMessage: 'Cancel',
            }),
            description: i18n.translate('xpack.runningQueries.table.cancelActionDescription', {
              defaultMessage: 'Cancel this query',
            }),
            icon: 'cross',
            type: 'icon',
            onClick: (query: RunningQuery) => onCancelQuery(query.taskId),
          },
        ],
      },
    ],
    [onCancelQuery]
  );

  const uniqueSources = useMemo(() => [...new Set(queries.map((q) => q.source))], [queries]);

  const searchFilters: SearchFilterConfig[] = useMemo(
    () => [
      {
        type: 'field_value_selection',
        field: 'queryType',
        name: i18n.translate('xpack.runningQueries.table.queryTypeFilter', {
          defaultMessage: 'Query type',
        }),
        multiSelect: 'or' as const,
        options: [
          { value: 'ES|QL', name: 'ES|QL' },
          { value: 'DSL', name: 'DSL' },
          { value: 'Other', name: 'Other' },
        ],
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
    [uniqueSources]
  );

  return (
    <EuiInMemoryTable
      items={queries}
      columns={columns}
      search={{
        box: {
          incremental: true,
        },
        filters: searchFilters,
      }}
      pagination={true}
      sorting={{
        sort: {
          field: 'startTime',
          direction: 'desc',
        },
      }}
    />
  );
};
