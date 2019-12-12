/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { EuiBasicTable, EuiButtonIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { RIGHT_ALIGNMENT } from '@elastic/eui/lib/services';
import { TimeRange } from '../../../../../../common/http_api/shared/time_range';
import { LogEntryRateResults } from '../../use_log_entry_rate_results';
import { AnomaliesTableExpandedRow } from './expanded_row';
import { formatAnomalyScore, getFriendlyNameForPartitionId } from '../helpers/data_formatters';
import euiStyled from '../../../../../../../../common/eui_styled_components';

interface TableItem {
  id: string;
  partition: string;
  topAnomalyScore: number;
}

interface SortingOptions {
  sort: {
    field: string;
    direction: string;
  };
}

const collapseAriaLabel = i18n.translate('xpack.infra.logs.analysis.anomaliesTableCollapseLabel', {
  defaultMessage: 'Collapse',
});

const expandAriaLabel = i18n.translate('xpack.infra.logs.analysis.anomaliesTableExpandLabel', {
  defaultMessage: 'Expand',
});

const partitionColumnName = i18n.translate(
  'xpack.infra.logs.analysis.anomaliesTablePartitionColumnName',
  {
    defaultMessage: 'Partition',
  }
);

const maxAnomalyScoreColumnName = i18n.translate(
  'xpack.infra.logs.analysis.anomaliesTableMaxAnomalyScoreColumnName',
  {
    defaultMessage: 'Max anomaly score',
  }
);

export const AnomaliesTable: React.FunctionComponent<{
  results: LogEntryRateResults;
  setTimeRange: (timeRange: TimeRange) => void;
  timeRange: TimeRange;
  jobId: string;
}> = ({ results, timeRange, setTimeRange, jobId }) => {
  const tableItems: TableItem[] = useMemo(() => {
    return Object.entries(results.partitionBuckets).map(([key, value]) => {
      return {
        // Note: EUI's table expanded rows won't work with a key of '' in itemIdToExpandedRowMap, so we have to use the friendly name here
        id: getFriendlyNameForPartitionId(key),
        // The real ID
        partitionId: key,
        partition: getFriendlyNameForPartitionId(key),
        topAnomalyScore: formatAnomalyScore(value.topAnomalyScore),
      };
    });
  }, [results]);

  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<
    Record<string, React.ReactNode>
  >({});

  const [sorting, setSorting] = useState<SortingOptions>({
    sort: {
      field: 'topAnomalyScore',
      direction: 'desc',
    },
  });

  const handleTableChange = useCallback(
    ({ sort = {} }) => {
      const { field, direction } = sort;
      setSorting({
        sort: {
          field,
          direction,
        },
      });
    },
    [setSorting]
  );

  const sortedTableItems = useMemo(() => {
    let sortedItems: TableItem[] = [];
    if (sorting.sort.field === 'partition') {
      sortedItems = tableItems.sort((a, b) => (a.partition > b.partition ? 1 : -1));
    } else if (sorting.sort.field === 'topAnomalyScore') {
      sortedItems = tableItems.sort((a, b) => a.topAnomalyScore - b.topAnomalyScore);
    }
    return sorting.sort.direction === 'asc' ? sortedItems : sortedItems.reverse();
  }, [tableItems, sorting]);

  const toggleExpandedItems = useCallback(
    item => {
      if (itemIdToExpandedRowMap[item.id]) {
        const { [item.id]: toggledItem, ...remainingExpandedRowMap } = itemIdToExpandedRowMap;
        setItemIdToExpandedRowMap(remainingExpandedRowMap);
      } else {
        const newItemIdToExpandedRowMap = {
          ...itemIdToExpandedRowMap,
          [item.id]: (
            <AnomaliesTableExpandedRow
              partitionId={item.partitionId}
              results={results}
              topAnomalyScore={item.topAnomalyScore}
              setTimeRange={setTimeRange}
              timeRange={timeRange}
              jobId={jobId}
            />
          ),
        };
        setItemIdToExpandedRowMap(newItemIdToExpandedRowMap);
      }
    },
    [results, setTimeRange, timeRange, itemIdToExpandedRowMap, setItemIdToExpandedRowMap]
  );

  const columns = [
    {
      field: 'partition',
      name: partitionColumnName,
      sortable: true,
      truncateText: true,
    },
    {
      field: 'topAnomalyScore',
      name: maxAnomalyScoreColumnName,
      sortable: true,
      truncateText: true,
      dataType: 'number',
    },
    {
      align: RIGHT_ALIGNMENT,
      width: '40px',
      isExpander: true,
      render: (item: TableItem) => (
        <EuiButtonIcon
          onClick={() => toggleExpandedItems(item)}
          aria-label={itemIdToExpandedRowMap[item.id] ? collapseAriaLabel : expandAriaLabel}
          iconType={itemIdToExpandedRowMap[item.id] ? 'arrowUp' : 'arrowDown'}
        />
      ),
    },
  ];

  return (
    <StyledEuiBasicTable
      items={sortedTableItems}
      itemId="id"
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      isExpandable={true}
      hasActions={true}
      columns={columns}
      sorting={sorting}
      onChange={handleTableChange}
    />
  );
};

const StyledEuiBasicTable = euiStyled(EuiBasicTable)`
  & .euiTable {
    table-layout: auto;
  }
`;
