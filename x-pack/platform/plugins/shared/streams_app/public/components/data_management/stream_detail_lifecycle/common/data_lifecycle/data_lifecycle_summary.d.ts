import React from 'react';
import type { DownsampleStep } from '@kbn/streams-schema/src/models/ingest/lifecycle';
import { type LifecyclePhase } from './lifecycle_types';
export interface DataLifecycleSummaryModel {
    phases: LifecyclePhase[];
    loading?: boolean;
    downsampleSteps?: DownsampleStep[];
    testSubjPrefix?: string;
}
export interface DataLifecycleSummaryCapabilities {
    canManageLifecycle: boolean;
}
export interface DataLifecycleSummaryPhaseActions {
    onPhaseClick?: (phase: LifecyclePhase, index: number) => void;
    onRemovePhase?: (phaseName: string) => void;
    onEditPhase?: (phaseName: string) => void;
    showPhaseActions?: boolean;
}
export interface DataLifecycleSummaryDownsamplingActions {
    onRemoveDownsampleStep?: (stepNumber: number) => void;
    onEditDownsampleStep?: (stepNumber: number, phaseName?: string) => void;
}
export interface DataLifecycleSummaryUiState {
    editedPhaseName?: string;
    isEditLifecycleFlyoutOpen?: boolean;
}
interface DataLifecycleSummaryProps {
    model: DataLifecycleSummaryModel;
    showDownsampling: boolean;
    capabilities: DataLifecycleSummaryCapabilities;
    headerActions?: React.ReactNode;
    phaseActions?: DataLifecycleSummaryPhaseActions;
    downsamplingActions?: DataLifecycleSummaryDownsamplingActions;
    uiState?: DataLifecycleSummaryUiState;
}
export declare const DataLifecycleSummary: ({ model, showDownsampling, capabilities, headerActions, phaseActions, downsamplingActions, uiState, }: DataLifecycleSummaryProps) => React.JSX.Element;
export {};
