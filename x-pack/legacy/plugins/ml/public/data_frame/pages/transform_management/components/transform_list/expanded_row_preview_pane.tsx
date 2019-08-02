/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { SortDirection } from '@elastic/eui';
import { ml } from '../../../../../services/ml_api_service';

import {
  getFlattenedFields,
  useRefreshTransformList,
  PreviewRequestBody,
  DataFrameTransformPivotConfig,
} from '../../../../common';
import { TransformTable } from './transform_table';

interface Column {
  field: string;
  name: string;
  sortable: boolean;
  truncateText: boolean;
}

interface Props {
  transformConfig: DataFrameTransformPivotConfig;
}

export function sortColumns(groupByArr: string[]) {
  return (a: string, b: string) => {
    // make sure groupBy fields are always most left columns
    if (groupByArr.some(aggName => aggName === a) && groupByArr.some(aggName => aggName === b)) {
      return a.localeCompare(b);
    }
    if (groupByArr.some(aggName => aggName === a)) {
      return -1;
    }
    if (groupByArr.some(aggName => aggName === b)) {
      return 1;
    }
    return a.localeCompare(b);
  };
}

function getDataFromTransform(
  transformConfig: DataFrameTransformPivotConfig
): { previewRequest: PreviewRequestBody; groupByArr: string[] | [] } {
  const index = transformConfig.source.index;
  const pivot = transformConfig.pivot;
  const groupByArr = [];

  const previewRequest: PreviewRequestBody = {
    source: {
      index,
    },
    pivot,
  };
  // hasOwnProperty check to ensure only properties on object itself, and not its prototypes
  if (pivot.group_by !== undefined) {
    for (const key in pivot.group_by) {
      if (pivot.group_by.hasOwnProperty(key)) {
        groupByArr.push(key);
      }
    }
  }

  return { groupByArr, previewRequest };
}

export const ExpandedRowPreviewPane: FC<Props> = ({ transformConfig }) => {
  const [dataFramePreviewData, setDataFramePreviewData] = useState([]);
  const [columns, setColumns] = useState<Column[] | []>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<string>(SortDirection.ASC);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const getPreviewFactory = () => {
    let concurrentLoads = 0;

    return async function getPreview() {
      try {
        concurrentLoads++;

        if (concurrentLoads > 1) {
          return;
        }

        const { previewRequest, groupByArr } = getDataFromTransform(transformConfig);
        setIsLoading(true);
        const resp: any = await ml.dataFrame.getDataFrameTransformsPreview(previewRequest);
        setIsLoading(false);

        if (resp.preview.length > 0) {
          const columnKeys = getFlattenedFields(resp.preview[0]);
          columnKeys.sort(sortColumns(groupByArr));
          const tableColumns = columnKeys.map(k => {
            return {
              field: k,
              name: k,
              sortable: true,
              truncateText: true,
            };
          });

          setDataFramePreviewData(resp.preview);
          setColumns(tableColumns);
          setSortField(sortField);
          setSortDirection(sortDirection);
        }
        concurrentLoads--;

        if (concurrentLoads > 0) {
          concurrentLoads = 0;
          getPreview();
        }
      } catch (error) {
        setIsLoading(false);
        setErrorMessage(
          i18n.translate('xpack.ml.dfTransformList.stepDetails.previewPane.errorMessage', {
            defaultMessage: 'Preview could not be loaded',
          })
        );
      }
    };
  };

  useRefreshTransformList({ onRefresh: getPreviewFactory() });

  const pagination = {
    initialPageIndex: pageIndex,
    initialPageSize: pageSize,
    totalItemCount: dataFramePreviewData.length,
    pageSizeOptions: [10, 20],
    hidePerPageOptions: false,
  };

  const sorting = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };

  const onTableChange = ({
    page = { index: 0, size: 10 },
    sort = { field: columns[0].field, direction: SortDirection.ASC },
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
      loading={dataFramePreviewData.length === 0 && isLoading === true}
      compressed
      items={dataFramePreviewData}
      columns={columns}
      onChange={onTableChange}
      pagination={pagination}
      sorting={sorting}
      error={errorMessage}
    />
  );
};
