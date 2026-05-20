import type { DataStreamResponse } from '../../../../common';
export interface UIState {
    isCreateDataStreamFlyoutOpen: boolean;
    isEditPipelineFlyoutOpen: boolean;
    selectedDataStream: DataStreamResponse | null;
}
export interface UIStateActions {
    openCreateDataStreamFlyout: () => void;
    closeCreateDataStreamFlyout: () => void;
    openEditPipelineFlyout: (dataStream: DataStreamResponse) => void;
    closeEditPipelineFlyout: () => void;
    selectPipelineTab: (tab: 'table' | 'pipeline') => void;
    selectedPipelineTab: 'table' | 'pipeline';
}
export type UIStateContextValue = UIState & UIStateActions;
