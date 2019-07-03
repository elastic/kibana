/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { SFC, useEffect, useState } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiButtonEmpty, EuiEmptyPrompt, SortDirection } from '@elastic/eui';

import { JobId, moveToDataFrameWizard, useRefreshTransformList } from '../../../../common';

import { DataFrameJobListColumn, DataFrameJobListRow, ItemIdToExpandedRowMap } from './common';
import { getJobsFactory } from './job_service';
import { getColumns } from './columns';
import { ExpandedRow } from './expanded_row';
import { TransformTable } from './transform_table';
import { useRefreshInterval } from './use_refresh_interval';

function getItemIdToExpandedRowMap(
  itemIds: JobId[],
  dataFrameJobs: DataFrameJobListRow[]
): ItemIdToExpandedRowMap {
  return itemIds.reduce(
    (m: ItemIdToExpandedRowMap, jobId: JobId) => {
      const item = dataFrameJobs.find(job => job.config.id === jobId);
      if (item !== undefined) {
        m[jobId] = <ExpandedRow item={item} />;
      }
      return m;
    },
    {} as ItemIdToExpandedRowMap
  );
}

export const DataFrameJobList: SFC = () => {
  const [dataFrameJobs, setDataFrameJobs] = useState<DataFrameJobListRow[]>([]);
  const [blockRefresh, setBlockRefresh] = useState(false);
  const [expandedRowItemIds, setExpandedRowItemIds] = useState<JobId[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<string>(DataFrameJobListColumn.id);
  const [sortDirection, setSortDirection] = useState<string>(SortDirection.ASC);

  const getJobs = getJobsFactory(setDataFrameJobs, blockRefresh);
  // Subscribe to the refresh observable to trigger reloading the jobs list.
  const { isRefresh } = useRefreshTransformList();
  useEffect(() => {
    if (isRefresh) {
      getJobs(true);
    }
  });
  // Call useRefreshInterval() after the subscription above is set up.
  useRefreshInterval(setBlockRefresh);

  if (dataFrameJobs.length === 0) {
    return (
      <EuiEmptyPrompt
        title={
          <h2>
            {i18n.translate('xpack.ml.dataFrame.list.emptyPromptTitle', {
              defaultMessage: 'No data frame transforms found',
            })}
          </h2>
        }
        actions={[
          <EuiButtonEmpty onClick={moveToDataFrameWizard}>
            {i18n.translate('xpack.ml.dataFrame.list.emptyPromptButtonText', {
              defaultMessage: 'Create your first data frame transform',
            })}
          </EuiButtonEmpty>,
        ]}
        data-test-subj="mlNoDataFrameJobsFound"
      />
    );
  }

  const columns = getColumns(getJobs, expandedRowItemIds, setExpandedRowItemIds);

  const sorting = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };

  const itemIdToExpandedRowMap = getItemIdToExpandedRowMap(expandedRowItemIds, dataFrameJobs);

  const pagination = {
    initialPageIndex: pageIndex,
    initialPageSize: pageSize,
    totalItemCount: dataFrameJobs.length,
    pageSizeOptions: [10, 20, 50],
    hidePerPageOptions: false,
  };

  const onTableChange = ({
    page = { index: 0, size: 10 },
    sort = { field: DataFrameJobListColumn.id, direction: SortDirection.ASC },
  }: {
    page: { index: number; size: number };
    sort: { field: string; direction: string };
  }) => {
    const { index, size } = page;
    setPageIndex(index);
    setPageSize(size);

    const { field, direction } = sort;
    setSortField(field);
    setSortDirection(direction);
  };

  return (
    <TransformTable
      columns={columns}
      hasActions={false}
      isExpandable={true}
      isSelectable={false}
      items={dataFrameJobs}
      itemId={DataFrameJobListColumn.id}
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      onChange={onTableChange}
      pagination={pagination}
      sorting={sorting}
      data-test-subj="mlDataFramesTableJobs"
    />
  );
};
