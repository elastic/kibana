/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState } from 'react';
import { i18n } from '@kbn/i18n';
import moment from 'moment-timezone';
import { Direction } from '@elastic/eui';
import { SortDirection, SORT_DIRECTION, FieldDataColumnType } from '../../../../../shared_imports';

import { useApi } from '../../../../hooks/use_api';

import {
  getFlattenedFields,
  useRefreshTransformList,
  EsDoc,
  PreviewRequestBody,
  TransformPivotConfig,
} from '../../../../common';
import { ES_FIELD_TYPES } from '../../../../../../../../../../src/plugins/data/public';
import { formatHumanReadableDateTimeSeconds } from '../../../../../../common/utils/date_utils';
import { transformTableFactory } from './transform_table';

const TransformTable = transformTableFactory<EsDoc>();

interface Props {
  transformConfig: TransformPivotConfig;
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
  transformConfig: TransformPivotConfig
): { previewRequest: PreviewRequestBody; groupByArr: string[] | [] } {
  const index = transformConfig.source.index;
  const query = transformConfig.source.query;
  const pivot = transformConfig.pivot;
  const groupByArr = [];

  const previewRequest: PreviewRequestBody = {
    source: {
      index,
      query,
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
  const [previewData, setPreviewData] = useState<EsDoc[]>([]);
  const [columns, setColumns] = useState<Array<FieldDataColumnType<EsDoc>> | []>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortDirection, setSortDirection] = useState<SortDirection | Direction>(SORT_DIRECTION.ASC);
  const [sortField, setSortField] = useState<keyof typeof previewData[number] | ''>('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const api = useApi();

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
        const resp: any = await api.getTransformsPreview(previewRequest);
        setIsLoading(false);

        if (resp.preview.length > 0) {
          const columnKeys = getFlattenedFields(resp.preview[0]);
          columnKeys.sort(sortColumns(groupByArr));

          const tableColumns: Array<FieldDataColumnType<EsDoc>> = columnKeys.map(k => {
            const column: FieldDataColumnType<EsDoc> = {
              field: k,
              name: k,
              sortable: true,
              truncateText: true,
            };

            if (typeof resp.mappings.properties[k] !== 'undefined') {
              const esFieldType = resp.mappings.properties[k].type;
              switch (esFieldType) {
                case ES_FIELD_TYPES.BOOLEAN:
                  column.dataType = 'boolean';
                  break;
                case ES_FIELD_TYPES.DATE:
                  column.align = 'right';
                  column.render = (d: any) =>
                    formatHumanReadableDateTimeSeconds(moment(d).unix() * 1000);
                  break;
                case ES_FIELD_TYPES.BYTE:
                case ES_FIELD_TYPES.DOUBLE:
                case ES_FIELD_TYPES.FLOAT:
                case ES_FIELD_TYPES.HALF_FLOAT:
                case ES_FIELD_TYPES.INTEGER:
                case ES_FIELD_TYPES.LONG:
                case ES_FIELD_TYPES.SCALED_FLOAT:
                case ES_FIELD_TYPES.SHORT:
                  column.dataType = 'number';
                  break;
                case ES_FIELD_TYPES.KEYWORD:
                case ES_FIELD_TYPES.TEXT:
                  column.dataType = 'string';
                  break;
              }
            }

            return column;
          });

          setPreviewData(resp.preview);
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
          i18n.translate('xpack.transform.transformList.stepDetails.previewPane.errorMessage', {
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
    totalItemCount: previewData.length,
    pageSizeOptions: [10, 20],
    hidePerPageOptions: false,
  };

  const sorting = {
    sort: {
      field: sortField as string,
      direction: sortDirection,
    },
  };

  const onTableChange = ({
    page = { index: 0, size: 10 },
    sort = { field: columns[0].field, direction: SORT_DIRECTION.ASC },
  }: {
    page?: { index: number; size: number };
    sort?: { field: keyof typeof previewData[number]; direction: SortDirection | Direction };
  }) => {
    const { index, size } = page;
    setPageIndex(index);
    setPageSize(size);

    const { field, direction } = sort;
    setSortField(field);
    setSortDirection(direction);
  };

  const transformTableLoading = previewData.length === 0 && isLoading === true;
  const dataTestSubj = `transformPreviewTabContent${!transformTableLoading ? ' loaded' : ''}`;

  return (
    <div data-test-subj={dataTestSubj}>
      <TransformTable
        allowNeutralSort={false}
        loading={transformTableLoading}
        compressed
        items={previewData}
        columns={columns}
        onTableChange={onTableChange}
        pagination={pagination}
        rowProps={() => ({
          'data-test-subj': 'transformPreviewTabContentRow',
        })}
        sorting={sorting}
        error={errorMessage}
      />
    </div>
  );
};
