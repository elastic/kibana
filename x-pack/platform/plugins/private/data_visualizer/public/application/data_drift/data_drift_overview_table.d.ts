import type { UseTableState } from '@kbn/ml-in-memory-table';
import React from 'react';
import { type Feature, FETCH_STATUS } from './types';
export declare const DataDriftOverviewTable: ({ data, onTableChange, pagination, sorting, status, }: {
    data: Feature[];
    status: FETCH_STATUS;
} & UseTableState<Feature>) => React.JSX.Element;
