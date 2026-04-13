import React from 'react';
import type { Streams, IngestStreamLifecycle, PhaseName } from '@kbn/streams-schema';
import type { DataStreamStats } from './use_data_stream_stats';
import type { LifecyclePhase } from '../common/data_lifecycle/lifecycle_types';
interface UseIlmLifecycleSummaryProps {
    definition: Streams.ingest.all.GetResponse;
    stats?: DataStreamStats;
    refreshDefinition?: () => void;
    updateStreamLifecycle: (lifecycle: IngestStreamLifecycle) => Promise<void>;
    isMetricsStream: boolean;
}
interface UseIlmLifecycleSummaryResult {
    phases: LifecyclePhase[];
    loading: boolean;
    onRemovePhase?: (phaseName: string) => void;
    onRemoveDownsampleStep?: (stepNumber: number) => void;
    onEditPhase?: (phaseName: PhaseName) => void;
    onEditDownsampleStep?: (stepNumber: number, phaseName?: PhaseName) => void;
    editingPhase?: PhaseName;
    modals: React.ReactNode;
    ilmSelectedPhasesForAdd?: PhaseName[];
    ilmExcludedPhasesForAdd?: PhaseName[];
    onAddIlmPhase?: (phase: PhaseName) => void;
    isEditLifecycleFlyoutOpen: boolean;
    hasUnsavedEditLifecycleFlyoutChanges: boolean;
}
export declare const useIlmLifecycleSummary: ({ definition, stats, refreshDefinition, updateStreamLifecycle, isMetricsStream, }: UseIlmLifecycleSummaryProps) => UseIlmLifecycleSummaryResult;
export {};
