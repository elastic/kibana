/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IlmPolicyPhases, PhaseName } from '@kbn/streams-schema';
import type { DeleteContext, EsIlmPolicyPhases } from './ilm_policy_phase_helpers';

type ModalType = 'delete' | 'edit' | 'createPolicy' | null;

export interface LifecycleSummaryUiState {
  activeModal: ModalType;
  deleteContext: DeleteContext | null;
  editContext: { isManaged: boolean } | null;
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

export type LifecycleSummaryUiAction =
  | { type: 'setPolicyNames'; payload: string[] }
  | { type: 'setIsProcessing'; payload: boolean }
  | { type: 'setIsSavingEditFlyout'; payload: boolean }
  | { type: 'openDeleteModal'; payload: DeleteContext }
  | { type: 'setDeleteContext'; payload: DeleteContext | null }
  | { type: 'openEditModal'; payload: { isManaged: boolean } }
  | { type: 'openCreatePolicyModal'; payload: 'delete' | 'edit' }
  | { type: 'showBackModalFromCreatePolicy' }
  | { type: 'closeModals' }
  | { type: 'clearEditModalState' }
  | {
      type: 'openEditFlyout';
      payload: {
        initialPhases: IlmPolicyPhases;
        canonicalInitialPhases: IlmPolicyPhases;
        editingPhase: PhaseName | undefined;
      };
    }
  | { type: 'closeEditFlyout' }
  | { type: 'setEditingPhase'; payload: PhaseName | undefined }
  | { type: 'setPreviewPhases'; payload: IlmPolicyPhases | null }
  | { type: 'setPendingEditEsPhases'; payload: EsIlmPolicyPhases | null }
  | { type: 'setPendingNewPolicyEsPhases'; payload: EsIlmPolicyPhases | null };

export const initialLifecycleSummaryUiState: LifecycleSummaryUiState = {
  activeModal: null,
  deleteContext: null,
  editContext: null,
  isProcessing: false,
  policyNames: [],
  isEditLifecycleFlyoutOpen: false,
  editFlyoutInitialPhases: null,
  editFlyoutCanonicalInitialPhases: null,
  isSavingEditFlyout: false,
  previewPhases: null,
  editingPhase: undefined,
  createPolicyBackModal: null,
  pendingEditEsPhases: null,
  pendingNewPolicyEsPhases: null,
};

export const lifecycleSummaryUiReducer = (
  state: LifecycleSummaryUiState,
  action: LifecycleSummaryUiAction
): LifecycleSummaryUiState => {
  switch (action.type) {
    case 'setPolicyNames':
      return { ...state, policyNames: action.payload };
    case 'setIsProcessing':
      return { ...state, isProcessing: action.payload };
    case 'setIsSavingEditFlyout':
      return { ...state, isSavingEditFlyout: action.payload };
    case 'openDeleteModal':
      return { ...state, deleteContext: action.payload, activeModal: 'delete' };
    case 'setDeleteContext':
      return { ...state, deleteContext: action.payload };
    case 'openEditModal':
      return { ...state, editContext: action.payload, activeModal: 'edit' };
    case 'openCreatePolicyModal':
      return { ...state, createPolicyBackModal: action.payload, activeModal: 'createPolicy' };
    case 'showBackModalFromCreatePolicy':
      return { ...state, activeModal: state.createPolicyBackModal ?? 'delete' };
    case 'closeModals':
      return {
        ...state,
        activeModal: null,
        deleteContext: null,
        editContext: null,
        createPolicyBackModal: null,
        pendingEditEsPhases: null,
        pendingNewPolicyEsPhases: null,
      };
    case 'clearEditModalState':
      return {
        ...state,
        activeModal: null,
        editContext: null,
        pendingEditEsPhases: null,
        createPolicyBackModal: null,
      };
    case 'openEditFlyout':
      return {
        ...state,
        isEditLifecycleFlyoutOpen: true,
        editFlyoutInitialPhases: action.payload.initialPhases,
        editFlyoutCanonicalInitialPhases: action.payload.canonicalInitialPhases,
        previewPhases: null,
        editingPhase: action.payload.editingPhase,
      };
    case 'closeEditFlyout':
      return {
        ...state,
        isEditLifecycleFlyoutOpen: false,
        editFlyoutInitialPhases: null,
        editFlyoutCanonicalInitialPhases: null,
        previewPhases: null,
        editingPhase: undefined,
      };
    case 'setEditingPhase':
      return { ...state, editingPhase: action.payload };
    case 'setPreviewPhases':
      return { ...state, previewPhases: action.payload };
    case 'setPendingEditEsPhases':
      return { ...state, pendingEditEsPhases: action.payload };
    case 'setPendingNewPolicyEsPhases':
      return { ...state, pendingNewPolicyEsPhases: action.payload };
  }
};
