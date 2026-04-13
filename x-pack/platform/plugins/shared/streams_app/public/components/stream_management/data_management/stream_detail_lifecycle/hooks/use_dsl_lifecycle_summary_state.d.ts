import type { IngestStreamLifecycleDSL } from '@kbn/streams-schema';
export type OverrideSettingsContext = {
    type: 'removeDownsampleStep';
    stepNumber: number;
} | {
    type: 'editDownsampleSteps';
};
export interface DslLifecycleSummaryUiState {
    overrideSettingsContext: OverrideSettingsContext | null;
    isEditDslStepsFlyoutOpen: boolean;
    editFlyoutInitialSteps: IngestStreamLifecycleDSL | null;
    previewSteps: IngestStreamLifecycleDSL | null;
    selectedStepIndex: number | undefined;
    isSavingEditFlyout: boolean;
    pendingEditFlyoutSave: IngestStreamLifecycleDSL | null;
}
export type DslLifecycleSummaryUiAction = {
    type: 'openOverrideModal';
    payload: OverrideSettingsContext;
} | {
    type: 'closeOverrideModal';
} | {
    type: 'openEditFlyout';
    payload: {
        initialSteps: IngestStreamLifecycleDSL;
        selectedStepIndex: number | undefined;
    };
} | {
    type: 'closeEditFlyout';
} | {
    type: 'setPreviewSteps';
    payload: IngestStreamLifecycleDSL | null;
} | {
    type: 'setSelectedStepIndex';
    payload: number | undefined;
} | {
    type: 'setIsSavingEditFlyout';
    payload: boolean;
} | {
    type: 'setPendingEditFlyoutSave';
    payload: IngestStreamLifecycleDSL | null;
};
export declare const initialDslLifecycleSummaryUiState: DslLifecycleSummaryUiState;
export declare const dslLifecycleSummaryUiReducer: (state: DslLifecycleSummaryUiState, action: DslLifecycleSummaryUiAction) => DslLifecycleSummaryUiState;
