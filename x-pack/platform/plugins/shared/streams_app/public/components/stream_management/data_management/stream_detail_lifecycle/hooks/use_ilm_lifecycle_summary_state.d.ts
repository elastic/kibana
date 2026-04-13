import type { IlmPolicyPhases, PhaseName } from '@kbn/streams-schema';
import type { DeleteContext, EsIlmPolicyPhases } from './ilm_policy_phase_helpers';
type ModalType = 'delete' | 'edit' | 'createPolicy' | null;
export interface LifecycleSummaryUiState {
    activeModal: ModalType;
    deleteContext: DeleteContext | null;
    editContext: {
        isManaged: boolean;
    } | null;
    isProcessing: boolean;
    policyNames: string[];
    isEditLifecycleFlyoutOpen: boolean;
    editFlyoutInitialPhases: IlmPolicyPhases | null;
    editFlyoutCanonicalInitialPhases: IlmPolicyPhases | null;
    isSavingEditFlyout: boolean;
    previewPhases: IlmPolicyPhases | null;
    editingPhase: PhaseName | undefined;
    createPolicyBackModal: 'delete' | 'edit' | null;
    pendingEditEsPhases: EsIlmPolicyPhases | null;
    pendingNewPolicyEsPhases: EsIlmPolicyPhases | null;
}
export type LifecycleSummaryUiAction = {
    type: 'setPolicyNames';
    payload: string[];
} | {
    type: 'setIsProcessing';
    payload: boolean;
} | {
    type: 'setIsSavingEditFlyout';
    payload: boolean;
} | {
    type: 'openDeleteModal';
    payload: DeleteContext;
} | {
    type: 'setDeleteContext';
    payload: DeleteContext | null;
} | {
    type: 'openEditModal';
    payload: {
        isManaged: boolean;
    };
} | {
    type: 'openCreatePolicyModal';
    payload: 'delete' | 'edit';
} | {
    type: 'showBackModalFromCreatePolicy';
} | {
    type: 'closeModals';
} | {
    type: 'clearEditModalState';
} | {
    type: 'openEditFlyout';
    payload: {
        initialPhases: IlmPolicyPhases;
        canonicalInitialPhases: IlmPolicyPhases;
        editingPhase: PhaseName | undefined;
    };
} | {
    type: 'closeEditFlyout';
} | {
    type: 'setEditingPhase';
    payload: PhaseName | undefined;
} | {
    type: 'setPreviewPhases';
    payload: IlmPolicyPhases | null;
} | {
    type: 'setPendingEditEsPhases';
    payload: EsIlmPolicyPhases | null;
} | {
    type: 'setPendingNewPolicyEsPhases';
    payload: EsIlmPolicyPhases | null;
};
export declare const initialLifecycleSummaryUiState: LifecycleSummaryUiState;
export declare const lifecycleSummaryUiReducer: (state: LifecycleSummaryUiState, action: LifecycleSummaryUiAction) => LifecycleSummaryUiState;
export {};
