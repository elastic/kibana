import React from 'react';
import type { EnhancedFailureStoreStats } from '../../hooks/use_data_stream_stats';
export declare const IngestionCard: ({ period, hasPrivileges, stats, statsError, }: {
    period: "daily" | "monthly";
    hasPrivileges: boolean;
    stats?: EnhancedFailureStoreStats;
    statsError?: Error;
}) => React.JSX.Element;
