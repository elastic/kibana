import React from 'react';
import type { EnhancedFailureStoreStats } from '../hooks/use_data_stream_stats';
import type { useFailureStoreConfig } from '../hooks/use_failure_store_config';
interface FailureStoreSummaryProps {
    stats?: EnhancedFailureStoreStats;
    failureStoreConfig: ReturnType<typeof useFailureStoreConfig>;
    canManageLifecycle: boolean;
}
export declare const FailureStoreSummary: ({ stats, failureStoreConfig, canManageLifecycle, }: FailureStoreSummaryProps) => React.JSX.Element;
export {};
