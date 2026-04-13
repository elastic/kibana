import React from 'react';
import type { Streams } from '@kbn/streams-schema';
import type { DataStreamStats } from '../hooks/use_data_stream_stats';
interface LifecycleSummaryProps {
    definition: Streams.ingest.all.GetResponse;
    isMetricsStream: boolean;
    stats?: DataStreamStats;
    refreshDefinition?: () => void;
    onFlyoutOpenChange?: (isOpen: boolean) => void;
    onFlyoutUnsavedChangesChange?: (hasUnsavedChanges: boolean) => void;
}
export declare const LifecycleSummary: (props: LifecycleSummaryProps) => React.JSX.Element;
export {};
