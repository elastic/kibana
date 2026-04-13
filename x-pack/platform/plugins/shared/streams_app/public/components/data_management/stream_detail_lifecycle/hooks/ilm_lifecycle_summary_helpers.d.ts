import type { IlmPolicyPhases, IlmPolicyWithUsage, PhaseName } from '@kbn/streams-schema';
import type { DataStreamStats } from './use_data_stream_stats';
import type { LifecyclePhase } from '../common/data_lifecycle/lifecycle_types';
import type { AffectedResource } from '../downsampling/edit_policy_modal/edit_policy_modal';
type IlmPhaseUiMeta = Record<PhaseName, {
    color: string;
    description: string;
}>;
export declare const buildAffectedResources: (policy: IlmPolicyWithUsage, currentStreamName: string) => AffectedResource[];
export declare const getSelectedIlmPhases: ({ isEditLifecycleFlyoutOpen, previewPhases, editFlyoutInitialPhases, ilmStatsPhases, }: {
    isEditLifecycleFlyoutOpen: boolean;
    previewPhases: IlmPolicyPhases | null;
    editFlyoutInitialPhases: IlmPolicyPhases | null;
    ilmStatsPhases?: IlmPolicyPhases;
}) => PhaseName[];
export declare const buildLifecycleSummaryPhases: ({ isEditLifecycleFlyoutOpen, previewPhases, ilmStatsPhases, stats, ilmPhases, }: {
    isEditLifecycleFlyoutOpen: boolean;
    previewPhases: IlmPolicyPhases | null;
    ilmStatsPhases?: IlmPolicyPhases;
    stats?: DataStreamStats;
    ilmPhases: IlmPhaseUiMeta;
}) => LifecyclePhase[];
export {};
