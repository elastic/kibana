/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, SFC, useState } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiButtonEmpty, EuiCallOut, EuiEmptyPrompt, SortDirection } from '@elastic/eui';

import {
  DataFrameTransformId,
  moveToDataFrameWizard,
  useRefreshTransformList,
} from '../../../../common';
import { checkPermission } from '../../../../../privilege/check_privilege';

import {
  DataFrameTransformListColumn,
  DataFrameTransformListRow,
  ItemIdToExpandedRowMap,
} from './common';
import { getTransformsFactory } from '../../services/transform_service';
import { getColumns } from './columns';
import { ExpandedRow } from './expanded_row';
import { ProgressBar, TransformTable } from './transform_table';
import { useRefreshInterval } from './use_refresh_interval';

function getItemIdToExpandedRowMap(
  itemIds: DataFrameTransformId[],
  dataFrameTransforms: DataFrameTransformListRow[]
): ItemIdToExpandedRowMap {
  return itemIds.reduce(
    (m: ItemIdToExpandedRowMap, transformId: DataFrameTransformId) => {
      const item = dataFrameTransforms.find(transform => transform.config.id === transformId);
      if (item !== undefined) {
        m[transformId] = <ExpandedRow item={item} />;
      }
      return m;
    },
    {} as ItemIdToExpandedRowMap
  );
}

export const DataFrameTransformList: SFC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [blockRefresh, setBlockRefresh] = useState(false);

  const [transforms, setTransforms] = useState<DataFrameTransformListRow[]>([]);
  const [expandedRowItemIds, setExpandedRowItemIds] = useState<DataFrameTransformId[]>([]);

  const [errorMessage, setErrorMessage] = useState<any>(undefined);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [sortField, setSortField] = useState<string>(DataFrameTransformListColumn.id);
  const [sortDirection, setSortDirection] = useState<string>(SortDirection.ASC);

  const disabled =
    !checkPermission('canCreateDataFrame') ||
    !checkPermission('canPreviewDataFrame') ||
    !checkPermission('canStartStopDataFrame');

  const getTransforms = getTransformsFactory(
    setTransforms,
    setErrorMessage,
    setIsInitialized,
    blockRefresh
  );
  // Subscribe to the refresh observable to trigger reloading the transform list.
  useRefreshTransformList({ isLoading: setIsLoading, onRefresh: () => getTransforms(true) });
  // Call useRefreshInterval() after the subscription above is set up.
  useRefreshInterval(setBlockRefresh);

  // Before the transforms have been loaded for the first time, display the loading indicator only.
  // Otherwise a user would see 'No data frame transforms found' during the initial loading.
  if (!isInitialized) {
    return <ProgressBar isLoading={isLoading} />;
  }

  if (typeof errorMessage !== 'undefined') {
    return (
      <Fragment>
        <ProgressBar isLoading={isLoading} />
        <EuiCallOut
          title={i18n.translate('xpack.ml.dataFrame.list.errorPromptTitle', {
            defaultMessage: 'An error occurred getting the data frame transform list.',
          })}
          color="danger"
          iconType="alert"
        >
          <pre>{JSON.stringify(errorMessage)}</pre>
        </EuiCallOut>
      </Fragment>
    );
  }

  if (transforms.length === 0) {
    return (
      <Fragment>
        <ProgressBar isLoading={isLoading} />
        <EuiEmptyPrompt
          title={
            <h2>
              {i18n.translate('xpack.ml.dataFrame.list.emptyPromptTitle', {
                defaultMessage: 'No data frame transforms found',
              })}
            </h2>
          }
          actions={[
            <EuiButtonEmpty onClick={moveToDataFrameWizard} isDisabled={disabled}>
              {i18n.translate('xpack.ml.dataFrame.list.emptyPromptButtonText', {
                defaultMessage: 'Create your first data frame transform',
              })}
            </EuiButtonEmpty>,
          ]}
          data-test-subj="mlNoDataFrameTransformsFound"
        />
      </Fragment>
    );
  }

  const columns = getColumns(expandedRowItemIds, setExpandedRowItemIds);

  const sorting = {
    sort: {
      field: sortField,
      direction: sortDirection,
    },
  };

  const itemIdToExpandedRowMap = getItemIdToExpandedRowMap(expandedRowItemIds, transforms);

  const pagination = {
    initialPageIndex: pageIndex,
    initialPageSize: pageSize,
    totalItemCount: transforms.length,
    pageSizeOptions: [10, 20, 50],
    hidePerPageOptions: false,
  };

  const onTableChange = ({
    page = { index: 0, size: 10 },
    sort = { field: DataFrameTransformListColumn.id, direction: SortDirection.ASC },
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
    <Fragment>
      <ProgressBar isLoading={isLoading} />
      <TransformTable
        className="mlTransformTable"
        columns={columns}
        hasActions={false}
        isExpandable={true}
        isSelectable={false}
        items={transforms}
        itemId={DataFrameTransformListColumn.id}
        itemIdToExpandedRowMap={itemIdToExpandedRowMap}
        onChange={onTableChange}
        pagination={pagination}
        sorting={sorting}
        data-test-subj="mlDataFramesTableTransforms"
      />
    </Fragment>
  );
};
