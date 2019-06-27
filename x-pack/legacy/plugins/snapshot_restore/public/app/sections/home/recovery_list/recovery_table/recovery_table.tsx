/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import { sortByOrder } from 'lodash';
import { EuiBasicTable, EuiButtonIcon, EuiHealth } from '@elastic/eui';
import { RIGHT_ALIGNMENT } from '@elastic/eui/lib/services';
import { SnapshotRecovery } from '../../../../../../common/types';
import { UIM_RESTORE_LIST_EXPAND_INDEX } from '../../../../constants';
import { useAppDependencies } from '../../../../index';
import { uiMetricService } from '../../../../services/ui_metric';
import { formatDate } from '../../../../services/text';
import { ShardsTable } from './shards_table';

interface Props {
  recoveries: SnapshotRecovery[];
}

export const RecoveryTable: React.FunctionComponent<Props> = ({ recoveries }) => {
  const {
    core: { i18n },
  } = useAppDependencies();
  const { FormattedMessage } = i18n;
  const { trackUiMetric } = uiMetricService;

  // Track recoveries to show based on sort and pagination state
  const [currentRecoveries, setCurrentRecoveries] = useState<SnapshotRecovery[]>([]);

  // Sort state
  const [sorting, setSorting] = useState<{
    sort: {
      field: keyof SnapshotRecovery;
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
    totalItemCount: recoveries.length,
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
  const toggleIndexRecoveryDetails = (recovery: SnapshotRecovery) => {
    const { index, shards } = recovery;
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
  const refreshIndexRecoveryDetails = () => {
    const newItemIdToExpandedRowMap: typeof itemIdToExpandedRowMap = {};
    recoveries.forEach(recovery => {
      const { index, shards } = recovery;
      if (!itemIdToExpandedRowMap[index]) {
        return;
      }
      newItemIdToExpandedRowMap[index] = <ShardsTable shards={shards} />;
      setItemIdToExpandedRowMap(newItemIdToExpandedRowMap);
    });
  };

  // Get recoveries to show based on sort and pagination state
  const getCurrentRecoveries = (): SnapshotRecovery[] => {
    const newRecoveriesList = [...recoveries];
    const {
      sort: { field, direction },
    } = sorting;
    const { pageIndex, pageSize } = pagination;
    const sortedRecoveries = sortByOrder(newRecoveriesList, [field], [direction]);
    return sortedRecoveries.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  };

  // Update current recoveries to show if table changes
  useEffect(
    () => {
      setCurrentRecoveries(getCurrentRecoveries());
    },
    [sorting, pagination]
  );

  // Update current recoveries to show if data changes
  // as well as any expanded index details
  useEffect(
    () => {
      setPagination({
        ...pagination,
        totalItemCount: recoveries.length,
      });
      setCurrentRecoveries(getCurrentRecoveries());
      refreshIndexRecoveryDetails();
    },
    [recoveries]
  );

  const columns = [
    {
      field: 'index',
      name: i18n.translate('xpack.snapshotRestore.recoveryList.table.indexColumnTitle', {
        defaultMessage: 'Index',
      }),
      truncateText: true,
      sortable: true,
    },
    {
      field: 'isComplete',
      name: i18n.translate('xpack.snapshotRestore.recoveryList.table.statusColumnTitle', {
        defaultMessage: 'Status',
      }),
      truncateText: true,
      sortable: true,
      render: (isComplete: SnapshotRecovery['isComplete']) =>
        isComplete ? (
          <EuiHealth color="success">
            <FormattedMessage
              id="xpack.snapshotRestore.recoveryList.table.statusColumn.completeLabel"
              defaultMessage="Complete"
            />
          </EuiHealth>
        ) : (
          <EuiHealth color="warning">
            <FormattedMessage
              id="xpack.snapshotRestore.recoveryList.table.statusColumn.inProgressLabel"
              defaultMessage="In progress"
            />
          </EuiHealth>
        ),
    },
    {
      field: 'latestActivityTimeInMillis',
      name: i18n.translate('xpack.snapshotRestore.recoveryList.table.lastActivityTitle', {
        defaultMessage: 'Last activity',
      }),
      truncateText: true,
      render: (
        latestActivityTimeInMillis: SnapshotRecovery['latestActivityTimeInMillis'],
        { isComplete }: SnapshotRecovery
      ) => {
        return isComplete ? (
          formatDate(latestActivityTimeInMillis)
        ) : (
          <FormattedMessage
            id="xpack.snapshotRestore.recoveryList.table.lastActivityColumn.nowLabel"
            defaultMessage="now"
          />
        );
      },
    },
    {
      field: 'shards',
      name: i18n.translate('xpack.snapshotRestore.recoveryList.table.shardsCompletedTitle', {
        defaultMessage: 'Shards completed',
      }),
      truncateText: true,
      render: (shards: SnapshotRecovery['shards']) => {
        return shards.filter(shard => Boolean(shard.stopTimeInMillis)).length;
      },
    },
    {
      field: 'shards',
      name: i18n.translate('xpack.snapshotRestore.recoveryList.table.shardsInProgressTitle', {
        defaultMessage: 'Shards in progress',
      }),
      truncateText: true,
      render: (shards: SnapshotRecovery['shards']) => {
        return shards.filter(shard => !Boolean(shard.stopTimeInMillis)).length;
      },
    },
    {
      align: RIGHT_ALIGNMENT,
      width: '40px',
      isExpander: true,
      render: (item: SnapshotRecovery) => (
        <EuiButtonIcon
          onClick={() => toggleIndexRecoveryDetails(item)}
          aria-label={itemIdToExpandedRowMap[item.index] ? 'Collapse' : 'Expand'}
          iconType={itemIdToExpandedRowMap[item.index] ? 'arrowUp' : 'arrowDown'}
        />
      ),
    },
  ];

  return (
    <EuiBasicTable
      items={currentRecoveries}
      itemId="index"
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      isExpandable={true}
      columns={columns}
      sorting={sorting}
      pagination={pagination}
      onChange={onTableChange}
      rowProps={(recovery: SnapshotRecovery) => ({
        'data-test-subj': 'row',
        onClick: () => toggleIndexRecoveryDetails(recovery),
      })}
      cellProps={(item: any, column: any) => ({
        'data-test-subj': `cell`,
      })}
      data-test-subj="recoveriesTable"
    />
  );
};
