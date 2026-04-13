import React from 'react';
import { Streams, type IngestStreamLifecycleDSL, type IngestStreamLifecycle } from '@kbn/streams-schema';
import type { DataStreamStats } from './use_data_stream_stats';
import type { LifecyclePhase } from '../common/data_lifecycle/lifecycle_types';
interface UseDslLifecycleSummaryProps {
    definition: Streams.ingest.all.GetResponse;
    stats?: DataStreamStats;
    refreshDefinition?: () => void;
    updateStreamLifecycle: (lifecycle: IngestStreamLifecycle) => Promise<void>;
}
interface UseDslLifecycleSummaryResult {
    phases: LifecyclePhase[];
    downsampleSteps?: IngestStreamLifecycleDSL['dsl']['downsample'];
    onRemoveDownsampleStep?: (stepNumber: number) => void;
    onEditDownsampleStep?: (stepNumber: number) => void;
    onAddDownsampleStep?: () => void;
    isEditLifecycleFlyoutOpen: boolean;
    modals: React.ReactNode;
}
export declare const useDslLifecycleSummary: ({ definition, stats, refreshDefinition, updateStreamLifecycle, }: UseDslLifecycleSummaryProps) => UseDslLifecycleSummaryResult;
export {};
