import React from 'react';
import type { DataStreamStats } from '../../hooks/use_data_stream_stats';
export declare const StorageSizeCard: ({ hasMonitorPrivileges, stats, statsError, }: {
    hasMonitorPrivileges: boolean;
    stats?: DataStreamStats;
    statsError?: Error;
}) => React.JSX.Element;
