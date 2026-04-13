import React from 'react';
import type { EnhancedDataStreamStats } from '../../hooks/use_data_stream_stats';
export declare const IngestionCard: ({ period, hasMonitorPrivileges, stats, statsError, }: {
    period: "daily" | "monthly";
    hasMonitorPrivileges: boolean;
    stats?: EnhancedDataStreamStats;
    statsError?: Error;
}) => React.JSX.Element;
