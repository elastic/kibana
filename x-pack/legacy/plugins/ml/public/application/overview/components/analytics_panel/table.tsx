/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState } from 'react';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  mlInMemoryTableFactory,
  SortDirection,
  SORT_DIRECTION,
  OnTableChangeArg,
  ColumnType,
} from '../../../components/ml_in_memory_table';
import { getAnalysisType } from '../../../data_frame_analytics/common/analytics';
import {
  DataFrameAnalyticsListColumn,
  DataFrameAnalyticsListRow,
} from '../../../data_frame_analytics/pages/analytics_management/components/analytics_list/common';
import {
  getTaskStateBadge,
  progressColumn,
} from '../../../data_frame_analytics/pages/analytics_management/components/analytics_list/columns';
import { AnalyticsViewAction } from '../../../data_frame_analytics/pages/analytics_management/components/analytics_list/actions';
import { formatHumanReadableDateTimeSeconds } from '../../../util/date_utils';

const MlInMemoryTable = mlInMemoryTableFactory<DataFrameAnalyticsListRow>();

interface Props {
  items: DataFrameAnalyticsListRow[];
}
export const AnalyticsTable: FC<Props> = ({ items }) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [sortField, setSortField] = useState<string>(DataFrameAnalyticsListColumn.id);
  const [sortDirection, setSortDirection] = useState<SortDirection>(SORT_DIRECTION.ASC);

  // id, type, status, progress, created time, view icon
  const columns: Array<ColumnType<DataFrameAnalyticsListRow>> = [
    {
      field: DataFrameAnalyticsListColumn.id,
      name: i18n.translate('xpack.ml.overview.analyticsList.id', { defaultMessage: 'ID' }),
      sortable: true,
      truncateText: true,
      width: '20%',
    },
    {
      name: i18n.translate('xpack.ml.overview.analyticsList.type', { defaultMessage: 'Type' }),
      sortable: (item: DataFrameAnalyticsListRow) => getAnalysisType(item.config.analysis),
      truncateText: true,
      render(item: DataFrameAnalyticsListRow) {
        return <EuiBadge color="hollow">{getAnalysisType(item.config.analysis)}</EuiBadge>;
      },
      width: '150px',
    },
    {
      name: i18n.translate('xpack.ml.overview.analyticsList.status', { defaultMessage: 'Status' }),
      sortable: (item: DataFrameAnalyticsListRow) => item.stats.state,
      truncateText: true,
      render(item: DataFrameAnalyticsListRow) {
        return getTaskStateBadge(item.stats.state, item.stats.reason);
      },
      width: '100px',
    },
    progressColumn,
    {
      field: DataFrameAnalyticsListColumn.configCreateTime,
      name: i18n.translate('xpack.ml.overview.analyticsList.reatedTimeColumnName', {
        defaultMessage: 'Creation time',
      }),
      dataType: 'date',
      render: (time: number) => formatHumanReadableDateTimeSeconds(time),
      textOnly: true,
      truncateText: true,
      sortable: true,
      width: '20%',
    },
    {
      name: i18n.translate('xpack.ml.overview.analyticsList.tableActionLabel', {
        defaultMessage: 'Actions',
      }),
      actions: [AnalyticsViewAction],
      width: '100px',
    },
  ];

  const onTableChange = ({
    page = { index: 0, size: 10 },
    sort = { field: DataFrameAnalyticsListColumn.id, direction: SORT_DIRECTION.ASC },
  }: OnTableChangeArg) => {
    const { index, size } = page;
    setPageIndex(index);
    setPageSize(size);

    const { field, direction } = sort;
    setSortField(field);
    setSortDirection(direction);
  };

  const pagination = {
    initialPageIndex: pageIndex,
    initialPageSize: pageSize,
    totalItemCount: items.length,
    pageSizeOptions: [10, 20, 50],
    hidePerPageOptions: false,
  };

  const sorting = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };

  return (
    <MlInMemoryTable
      allowNeutralSort={false}
      className="mlAnalyticsTable"
      columns={columns}
      hasActions={false}
      isExpandable={false}
      isSelectable={false}
      items={items}
      itemId={DataFrameAnalyticsListColumn.id}
      onTableChange={onTableChange}
      pagination={pagination}
      sorting={sorting}
      data-test-subj="mlOverviewTableAnalytics"
    />
  );
};
