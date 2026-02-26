/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestStreamLifecycleDSL } from '@kbn/streams-schema';
import { isEqual } from 'lodash';

export type OverrideSettingsContext =
  | { type: 'removeDownsampleStep'; stepNumber: number }
  | { type: 'editDownsampleSteps' };

export interface DslLifecycleSummaryUiState {
  overrideSettingsContext: OverrideSettingsContext | null;
  isEditDslStepsFlyoutOpen: boolean;
  editFlyoutInitialSteps: IngestStreamLifecycleDSL | null;
  previewSteps: IngestStreamLifecycleDSL | null;
  flyoutInvalidStepIndices: number[];
  selectedStepIndex: number | undefined;
  isSavingEditFlyout: boolean;
  pendingEditFlyoutSave: IngestStreamLifecycleDSL | null;
}

export type DslLifecycleSummaryUiAction =
  | { type: 'openOverrideModal'; payload: OverrideSettingsContext }
  | { type: 'closeOverrideModal' }
  | {
      type: 'openEditFlyout';
      payload: { initialSteps: IngestStreamLifecycleDSL; selectedStepIndex: number | undefined };
    }
  | { type: 'closeEditFlyout' }
  | { type: 'setPreviewSteps'; payload: IngestStreamLifecycleDSL | null }
  | { type: 'setFlyoutInvalidStepIndices'; payload: number[] }
  | { type: 'setSelectedStepIndex'; payload: number | undefined }
  | { type: 'setIsSavingEditFlyout'; payload: boolean }
  | { type: 'setPendingEditFlyoutSave'; payload: IngestStreamLifecycleDSL | null };

export const initialDslLifecycleSummaryUiState: DslLifecycleSummaryUiState = {
  overrideSettingsContext: null,
  isEditDslStepsFlyoutOpen: false,
  editFlyoutInitialSteps: null,
  previewSteps: null,
  flyoutInvalidStepIndices: [],
  selectedStepIndex: undefined,
  isSavingEditFlyout: false,
  pendingEditFlyoutSave: null,
};

export const dslLifecycleSummaryUiReducer = (
  state: DslLifecycleSummaryUiState,
  action: DslLifecycleSummaryUiAction
): DslLifecycleSummaryUiState => {
  switch (action.type) {
    case 'openOverrideModal':
      return { ...state, overrideSettingsContext: action.payload };
    case 'closeOverrideModal':
      return { ...state, overrideSettingsContext: null, pendingEditFlyoutSave: null };
    case 'openEditFlyout':
      return {
        ...state,
        isEditDslStepsFlyoutOpen: true,
        editFlyoutInitialSteps: action.payload.initialSteps,
        previewSteps: null,
        flyoutInvalidStepIndices: [],
        selectedStepIndex: action.payload.selectedStepIndex,
        pendingEditFlyoutSave: null,
      };
    case 'closeEditFlyout':
      return {
        ...state,
        isEditDslStepsFlyoutOpen: false,
        editFlyoutInitialSteps: null,
        previewSteps: null,
        flyoutInvalidStepIndices: [],
        selectedStepIndex: undefined,
      };
    case 'setPreviewSteps':
      if (isEqual(state.previewSteps, action.payload)) return state;
      return { ...state, previewSteps: action.payload };
    case 'setFlyoutInvalidStepIndices':
      if (isEqual(state.flyoutInvalidStepIndices, action.payload)) return state;
      return { ...state, flyoutInvalidStepIndices: action.payload };
    case 'setSelectedStepIndex':
      return { ...state, selectedStepIndex: action.payload };
    case 'setIsSavingEditFlyout':
      return { ...state, isSavingEditFlyout: action.payload };
    case 'setPendingEditFlyoutSave':
      return { ...state, pendingEditFlyoutSave: action.payload };
    default:
      return state;
  }
};
