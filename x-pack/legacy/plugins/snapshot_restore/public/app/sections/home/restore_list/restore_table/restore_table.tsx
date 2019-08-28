/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import { sortByOrder } from 'lodash';
import { EuiBasicTable, EuiButtonIcon, EuiHealth } from '@elastic/eui';
import { RIGHT_ALIGNMENT } from '@elastic/eui/lib/services';
import { SnapshotRestore } from '../../../../../../common/types';
import { UIM_RESTORE_LIST_EXPAND_INDEX } from '../../../../constants';
import { useAppDependencies } from '../../../../index';
import { uiMetricService } from '../../../../services/ui_metric';
import { FormattedDateTime } from '../../../../components';
import { ShardsTable } from './shards_table';

interface Props {
  restores: SnapshotRestore[];
}

export const RestoreTable: React.FunctionComponent<Props> = ({ restores }) => {
  const {
    core: { i18n },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;
  const { trackUiMetric } = uiMetricService;

  // Track restores to show based on sort and pagination state
  const [currentRestores, setCurrentRestores] = useState<SnapshotRestore[]>([]);

  // Sort state
  const [sorting, setSorting] = useState<{
    sort: {
      field: keyof SnapshotRestore;
      direction: 'asc' | 'desc';
    };
  }>({
    sort: {
      field: 'isComplete',
      direction: 'asc',
    },
  });

  // Pagination state
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 20,
    totalItemCount: restores.length,
    pageSizeOptions: [10, 20, 50],
  });

  // Track expanded indices
  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<{
    [key: string]: React.ReactNode;
  }>({});

  // On sorting and pagination change
  const onTableChange = ({ page = {}, sort = {} }: any) => {
    const { index: pageIndex, size: pageSize } = page;
    const { field: sortField, direction: sortDirection } = sort;
    setSorting({
      sort: {
        field: sortField,
        direction: sortDirection,
      },
    });
    setPagination({
      ...pagination,
      pageIndex,
      pageSize,
    });
  };

  // Expand or collapse index details
  const toggleIndexRestoreDetails = (restore: SnapshotRestore) => {
    const { index, shards } = restore;
    const newItemIdToExpandedRowMap = { ...itemIdToExpandedRowMap };

    if (newItemIdToExpandedRowMap[index]) {
      delete newItemIdToExpandedRowMap[index];
    } else {
      trackUiMetric(UIM_RESTORE_LIST_EXPAND_INDEX);
      newItemIdToExpandedRowMap[index] = <ShardsTable shards={shards} />;
    }
    setItemIdToExpandedRowMap(newItemIdToExpandedRowMap);
  };

  // Refresh expanded index details
  const refreshIndexRestoreDetails = () => {
    const newItemIdToExpandedRowMap: typeof itemIdToExpandedRowMap = {};
    restores.forEach(restore => {
      const { index, shards } = restore;
      if (!itemIdToExpandedRowMap[index]) {
        return;
      }
      newItemIdToExpandedRowMap[index] = <ShardsTable shards={shards} />;
      setItemIdToExpandedRowMap(newItemIdToExpandedRowMap);
    });
  };

  // Get restores to show based on sort and pagination state
  const getCurrentRestores = (): SnapshotRestore[] => {
    const newRestoresList = [...restores];
    const {
      sort: { field, direction },
    } = sorting;
    const { pageIndex, pageSize } = pagination;
    const sortedRestores = sortByOrder(newRestoresList, [field], [direction]);
    return sortedRestores.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  };

  // Update current restores to show if table changes
  useEffect(() => {
    setCurrentRestores(getCurrentRestores());
  }, [sorting, pagination]);

  // Update current restores to show if data changes
  // as well as any expanded index details
  useEffect(() => {
    setPagination({
      ...pagination,
      totalItemCount: restores.length,
    });
    setCurrentRestores(getCurrentRestores());
    refreshIndexRestoreDetails();
  }, [restores]);

  const columns = [
    {
      field: 'index',
      name: i18n.translate('xpack.snapshotRestore.restoreList.table.indexColumnTitle', {
        defaultMessage: 'Index',
      }),
      truncateText: true,
      sortable: true,
    },
    {
      field: 'isComplete',
      name: i18n.translate('xpack.snapshotRestore.restoreList.table.statusColumnTitle', {
        defaultMessage: 'Status',
      }),
      truncateText: true,
      sortable: true,
      render: (isComplete: SnapshotRestore['isComplete']) =>
        isComplete ? (
          <EuiHealth color="success">
            <FormattedMessage
              id="xpack.snapshotRestore.restoreList.table.statusColumn.completeLabel"
              defaultMessage="Complete"
            />
          </EuiHealth>
        ) : (
          <EuiHealth color="warning">
            <FormattedMessage
              id="xpack.snapshotRestore.restoreList.table.statusColumn.inProgressLabel"
              defaultMessage="In progress"
            />
          </EuiHealth>
        ),
    },
    {
      field: 'latestActivityTimeInMillis',
      name: i18n.translate('xpack.snapshotRestore.restoreList.table.lastActivityTitle', {
        defaultMessage: 'Last activity',
      }),
      truncateText: true,
      render: (
        latestActivityTimeInMillis: SnapshotRestore['latestActivityTimeInMillis'],
        { isComplete }: SnapshotRestore
      ) => {
        return isComplete ? (
          <FormattedDateTime epochMs={latestActivityTimeInMillis} />
        ) : (
          <FormattedMessage
            id="xpack.snapshotRestore.restoreList.table.lastActivityColumn.nowLabel"
            defaultMessage="now"
          />
        );
      },
    },
    {
      field: 'shards',
      name: i18n.translate('xpack.snapshotRestore.restoreList.table.shardsCompletedTitle', {
        defaultMessage: 'Shards completed',
      }),
      truncateText: true,
      render: (shards: SnapshotRestore['shards']) => {
        return shards.filter(shard => Boolean(shard.stopTimeInMillis)).length;
      },
    },
    {
      field: 'shards',
      name: i18n.translate('xpack.snapshotRestore.restoreList.table.shardsInProgressTitle', {
        defaultMessage: 'Shards in progress',
      }),
      truncateText: true,
      render: (shards: SnapshotRestore['shards']) => {
        return shards.filter(shard => !Boolean(shard.stopTimeInMillis)).length;
      },
    },
    {
      align: RIGHT_ALIGNMENT,
      width: '40px',
      isExpander: true,
      render: (item: SnapshotRestore) => (
        <EuiButtonIcon
          onClick={() => toggleIndexRestoreDetails(item)}
          aria-label={itemIdToExpandedRowMap[item.index] ? 'Collapse' : 'Expand'}
          iconType={itemIdToExpandedRowMap[item.index] ? 'arrowUp' : 'arrowDown'}
        />
      ),
    },
  ];

  return (
    <EuiBasicTable
      items={currentRestores}
      itemId="index"
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      isExpandable={true}
      columns={columns}
      sorting={sorting}
      pagination={pagination}
      onChange={onTableChange}
      rowProps={(restore: SnapshotRestore) => ({
        'data-test-subj': 'row',
        onClick: () => toggleIndexRestoreDetails(restore),
      })}
      cellProps={() => ({
        'data-test-subj': 'cell',
      })}
      data-test-subj="restoresTable"
    />
  );
};
