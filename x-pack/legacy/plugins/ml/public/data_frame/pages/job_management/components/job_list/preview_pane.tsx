/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useContext, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiInMemoryTable, EuiInMemoryTableProps, SortDirection } from '@elastic/eui';
import { getFlattenedFields } from '../../../../components/source_index_preview/common';
import { ml } from '../../../../../services/ml_api_service';

import {
  DataFramePreviewRequest,
  // PivotAggsConfigDict,
  // PivotGroupByConfig,
  // PivotGroupByConfigDict,
  // PivotQuery,
} from '../../../../common';

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
}

interface Props {
  transformId: string;
}

function getPreviewRequest(transformData: TransformData): DataFramePreviewRequest {
  const { transforms } = transformData;
  const index = transforms[0].source.index[0]; // TODO do some checking to make sure this doesn't throw
  const pivot = transforms[0].pivot;

  const request: DataFramePreviewRequest = {
    source: {
      index,
    },
    pivot,
  };

  return request;
}

export const PreviewPane: React.SFC<Props> = ({ transformId }) => {
  const [dataFramePreviewData, setDataFramePreviewData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [sort, setSort] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  async function getPreview() {
    try {
      const transformData: any = await ml.dataFrame.getDataFrameTransforms(transformId);
      const previewRequest = getPreviewRequest(transformData);
      const resp: any = await ml.dataFrame.getDataFrameTransformsPreview(previewRequest);
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

  useEffect(() => {
    getPreview();
  }, []);
  // TODO: sort so groupBy is always far left
  useEffect(
    () => {
      if (dataFramePreviewData.length > 0) {
        const columnKeys = getFlattenedFields(dataFramePreviewData[0]);
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
