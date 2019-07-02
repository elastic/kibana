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
import { DataFrameTransformWithId } from '../../../../common/job';

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
  transformConfig: DataFrameTransformWithId;
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
  transformConfig: DataFrameTransformWithId
): { previewRequest: DataFramePreviewRequest; groupByArr: string[] | [] } {
  const index = transformConfig.source.index[0];
  const pivot = transformConfig.pivot;
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

export const PreviewPane: FC<Props> = ({ transformConfig, lastUpdate }) => {
  const [dataFramePreviewData, setDataFramePreviewData] = useState([]);
  const [columns, setColumns] = useState<Column[] | []>([]);
  const [sort, setSort] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  async function getPreview() {
    try {
      const { previewRequest, groupByArr } = getDataFromTransform(transformConfig);
      const resp: any = await ml.dataFrame.getDataFrameTransformsPreview(previewRequest);

      if (resp.preview.length > 0) {
        const columnKeys = getFlattenedFields(resp.preview[0]);
        columnKeys.sort(sortColumns(groupByArr));
        const tableColumns = columnKeys.map(k => {
          return {
            field: k,
            name: k,
            sortable: false,
            truncateText: true,
          };
        });
        const sorting = {
          sort: {
            field: tableColumns[0].field,
            direction: SortDirection.ASC,
          },
        };

        setDataFramePreviewData(resp.preview);
        setColumns(tableColumns);
        setSort(sorting);
        setIsLoading(false);
      }
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
