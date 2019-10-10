/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { EuiBasicTable, EuiButtonIcon } from '@elastic/eui';
import { RIGHT_ALIGNMENT } from '@elastic/eui/lib/services';
import { TimeRange } from '../../../../../../common/http_api/shared/time_range';
import { GetLogEntryRateSuccessResponsePayload } from '../../../../../../common/http_api/log_analysis/results/log_entry_rate';
import { AnomaliesTableExpandedRow } from './expanded_row';
import { getTopAnomalyScoresByPartition } from '../helpers/data_formatters';

export const AnomaliesTable: React.FunctionComponent<{
  results: GetLogEntryRateSuccessResponsePayload['data'];
  setTimeRange: (timeRange: TimeRange) => void;
  timeRange: TimeRange;
}> = ({ results, timeRange, setTimeRange }) => {
  const tableItems = useMemo(() => {
    return Object.entries(getTopAnomalyScoresByPartition(results)).map(([key, value]) => {
      return {
        id: key || 'unknown', // Note: EUI's table expanded rows won't work with a key of '' in itemIdToExpandedRowMap
        partition: key || 'unknown',
        topAnomalyScore: Number(value).toFixed(0),
      };
    });
  }, [results]);

  const [itemIdToExpandedRowMap, setItemIdToExpandedRowMap] = useState<
    Record<string, React.ReactNode>
  >({});

  const toggleExpandedItems = useCallback(
    item => {
      if (itemIdToExpandedRowMap[item.id]) {
        const newItemIdToExpandedRowMap = {
          ...itemIdToExpandedRowMap,
        };
        delete newItemIdToExpandedRowMap[item.id];
        setItemIdToExpandedRowMap(newItemIdToExpandedRowMap);
      } else {
        const newItemIdToExpandedRowMap = {
          ...itemIdToExpandedRowMap,
          [item.id]: (
            <AnomaliesTableExpandedRow
              partitionId={item.id}
              results={results}
              topAnomalyScore={item.topAnomalyScore}
              setTimeRange={setTimeRange}
              timeRange={timeRange}
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
      name: 'Partition',
      sortable: true,
      truncateText: true,
    },
    {
      field: 'topAnomalyScore',
      name: 'Top anomaly score',
      sortable: true,
      truncateText: true,
    },
    {
      align: RIGHT_ALIGNMENT,
      width: '40px',
      isExpander: true,
      render: item => (
        <EuiButtonIcon
          onClick={() => toggleExpandedItems(item)}
          aria-label={itemIdToExpandedRowMap[item.id] ? 'Collapse' : 'Expand'}
          iconType={itemIdToExpandedRowMap[item.id] ? 'arrowUp' : 'arrowDown'}
        />
      ),
    },
  ];

  return (
    <EuiBasicTable
      items={tableItems}
      itemId="id"
      itemIdToExpandedRowMap={itemIdToExpandedRowMap}
      isExpandable={true}
      hasActions={true}
      columns={columns}
    />
  );
};
