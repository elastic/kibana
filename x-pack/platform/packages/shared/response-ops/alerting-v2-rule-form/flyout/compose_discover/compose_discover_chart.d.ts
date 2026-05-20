import React from 'react';
import type { QueryColumn } from './use_query_execution';
interface ComposeDiscoverChartProps {
    query: string;
    timeField: string;
    timeRange: {
        from: string;
        to: string;
    };
    columns: QueryColumn[];
}
export declare const ComposeDiscoverChart: React.FC<ComposeDiscoverChartProps>;
export {};
