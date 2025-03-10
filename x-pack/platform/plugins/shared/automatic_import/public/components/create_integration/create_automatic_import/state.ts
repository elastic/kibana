/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createContext, useContext } from 'react';
import type { Pipeline, Docs, SamplesFormat, CelInput } from '../../../../common';
import type { AIConnector, IntegrationSettings } from './types';

export interface State {
  step: number;
  connector?: AIConnector;
  integrationSettings?: IntegrationSettings;
  isGenerating: boolean;
  showCelCreateFlyout: boolean;
  isFlyoutGenerating: boolean;
  result?: {
    pipeline: Pipeline;
    docs: Docs;
    samplesFormat?: SamplesFormat;
  };
  celInputResult?: CelInput;
}

export const initialState: State = {
  step: 1,
  connector: undefined,
  integrationSettings: undefined,
  isGenerating: false,
  showCelCreateFlyout: false,
  isFlyoutGenerating: false,
  result: undefined,
};

type Action =
  | { type: 'SET_STEP'; payload: State['step'] }
  | { type: 'SET_CONNECTOR'; payload: State['connector'] }
  | { type: 'SET_INTEGRATION_SETTINGS'; payload: State['integrationSettings'] }
  | { type: 'SET_IS_GENERATING'; payload: State['isGenerating'] }
  | { type: 'SET_SHOW_CEL_CREATE_FLYOUT'; payload: State['showCelCreateFlyout'] }
  | { type: 'SET_IS_FLYOUT_GENERATING'; payload: State['isFlyoutGenerating'] }
  | { type: 'SET_GENERATED_RESULT'; payload: State['result'] }
  | { type: 'SET_CEL_INPUT_RESULT'; payload: State['celInputResult'] };

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'SET_STEP':
      return {
        ...state,
        step: action.payload,
        isGenerating: false,
        ...(action.payload < state.step && { result: undefined }), // reset the result when we go back
      };
    case 'SET_CONNECTOR':
      return { ...state, connector: action.payload };
    case 'SET_INTEGRATION_SETTINGS':
      return { ...state, integrationSettings: action.payload };
    case 'SET_IS_GENERATING':
      return { ...state, isGenerating: action.payload };
    case 'SET_SHOW_CEL_CREATE_FLYOUT':
      return { ...state, showCelCreateFlyout: action.payload };
    case 'SET_IS_FLYOUT_GENERATING':
      return { ...state, isFlyoutGenerating: action.payload };
    case 'SET_GENERATED_RESULT':
      return {
        ...state,
        // keep original result as the samplesFormat is not always included in the payload
        result: state.result ? { ...state.result, ...action.payload } : action.payload,
      };
    case 'SET_CEL_INPUT_RESULT':
      return { ...state, celInputResult: action.payload };
    default:
      return state;
  }
};

export interface Actions {
  setStep: (payload: State['step']) => void;
  setConnector: (payload: State['connector']) => void;
  setIntegrationSettings: (payload: State['integrationSettings']) => void;
  setIsGenerating: (payload: State['isGenerating']) => void;
  setResult: (payload: State['result']) => void;
  setShowCelCreateFlyout: (payload: State['showCelCreateFlyout']) => void;
  setIsFlyoutGenerating: (payload: State['isFlyoutGenerating']) => void;
  setCelInputResult: (payload: State['celInputResult']) => void;
  completeStep: () => void;
}

const ActionsContext = createContext<Actions | undefined>(undefined);
export const ActionsProvider = ActionsContext.Provider;
export const useActions = () => {
  const actions = useContext(ActionsContext);
  if (!actions) {
    throw new Error('useActions must be used within a ActionsProvider');
  }
  return actions;
};
