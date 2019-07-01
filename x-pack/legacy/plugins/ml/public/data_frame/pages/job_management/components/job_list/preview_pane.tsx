/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiInMemoryTable, EuiInMemoryTableProps, SortDirection } from '@elastic/eui';
import { getFlattenedFields } from '../../../../components/source_index_preview/common';
import { ml } from '../../../../../services/ml_api_service';

import { DataFramePreviewRequest } from '../../../../common';

interface Transform {
  dest: { index: string };
  id: string;
  pivot: {
    group_by: { [key: string]: any };
    aggregations: { [key: string]: any };
  };
  source: {
    index: string[];
    query: { [key: string]: any };
  };
}

interface TransformData {
  count: number;
  transforms: Transform[];
}

interface CompressedTableProps extends EuiInMemoryTableProps {
  compressed: boolean;
  error: any;
}

interface Column {
  field: string;
  name: string;
  sortable: boolean;
  truncateText: boolean;
}

interface Props {
  lastUpdate: number;
  transformId: string;
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
  transformData: TransformData
): { previewRequest: DataFramePreviewRequest; groupByArr: string[] | [] } {
  const { transforms } = transformData;
  const index = transforms[0].source.index[0];
  const pivot = transforms[0].pivot;
  const groupByArr = [];

  const previewRequest: DataFramePreviewRequest = {
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

export const PreviewPane: React.SFC<Props> = ({ transformId, lastUpdate }) => {
  const [dataFramePreviewData, setDataFramePreviewData] = useState([]);
  const [groupByArray, setGroupByArray] = useState<string[] | []>([]);
  const [columns, setColumns] = useState<Column[] | []>([]);
  const [sort, setSort] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  async function getPreview() {
    try {
      const transformData: any = await ml.dataFrame.getDataFrameTransforms(transformId);
      const { previewRequest, groupByArr } = getDataFromTransform(transformData);
      const resp: any = await ml.dataFrame.getDataFrameTransformsPreview(previewRequest);
      setGroupByArray(groupByArr);
      setDataFramePreviewData(resp.preview);
    } catch (error) {
      setIsLoading(false);
      setErrorMessage(
        i18n.translate('xpack.ml.dfJobsList.jobDetails.previewPane.errorMessage', {
          defaultMessage: 'Preview could not be loaded',
        })
      );
    }
  }

  useEffect(
    () => {
      getPreview();
    },
    [lastUpdate]
  );
  useEffect(
    () => {
      if (dataFramePreviewData.length > 0) {
        const columnKeys = getFlattenedFields(dataFramePreviewData[0]);
        columnKeys.sort(sortColumns(groupByArray));
        const tableColumns = columnKeys.map(k => {
          return {
            field: k,
            name: k,
            sortable: true,
            truncateText: true,
          };
        });
        const sorting = {
          sort: {
            field: tableColumns[0].field,
            direction: SortDirection.ASC,
          },
        };
        setIsLoading(false);
        setColumns(tableColumns);
        setSort(sorting);
      }
    },
    [dataFramePreviewData]
  );

  const CompressedTable = (EuiInMemoryTable as any) as FC<CompressedTableProps>;

  return (
    <CompressedTable
      loading={dataFramePreviewData.length === 0 && isLoading === true}
      compressed
      items={dataFramePreviewData}
      columns={columns}
      pagination={{
        initialPageSize: 5,
        pageSizeOptions: [5, 10, 25],
      }}
      sorting={sort}
      error={errorMessage}
    />
  );
};
