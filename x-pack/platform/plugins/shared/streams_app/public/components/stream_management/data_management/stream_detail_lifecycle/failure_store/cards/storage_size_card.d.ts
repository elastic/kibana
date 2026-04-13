import React from 'react';
import type { EnhancedFailureStoreStats } from '../../hooks/use_data_stream_stats';
export declare const StorageSizeCard: ({ hasPrivileges, stats, statsError, }: {
    hasPrivileges: boolean;
    stats?: EnhancedFailureStoreStats;
    statsError?: Error;
}) => React.JSX.Element;
