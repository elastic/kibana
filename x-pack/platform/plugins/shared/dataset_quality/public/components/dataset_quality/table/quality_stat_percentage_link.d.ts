import React from 'react';
import type { DataStreamStat } from '../../../../common/data_streams_stats/data_stream_stat';
import type { DataStreamSelector, TimeRangeConfig } from '../../../../common/types';
export declare const QualityStatPercentageLink: ({ isLoading, dataStreamStat, timeRange, dataTestSubj, query, accessor, selector, fewDocStatsTooltip, }: {
    isLoading: boolean;
    dataStreamStat: DataStreamStat;
    timeRange: TimeRangeConfig;
    dataTestSubj: string;
    query?: {
        language: string;
        query: string;
    };
    accessor: "degradedDocs" | "failedDocs";
    selector?: DataStreamSelector;
    fewDocStatsTooltip: (docsCount: number) => string;
}) => React.JSX.Element;
