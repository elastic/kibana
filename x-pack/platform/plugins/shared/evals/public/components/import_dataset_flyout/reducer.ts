/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AddExamplesPayload } from '@kbn/evals-common';
import type { ImportFieldMapping, ImportRow, ImportRowError, ParseImportFileResult } from './lib';

export type ImportFileFormat = 'csv' | 'jsonl';
export type ImportDatasetMode = 'existing' | 'new';
export type ImportWizardStep = 'file' | 'map' | 'validate' | 'result';

export const MAX_PREVIEW_ROWS = 50;

export interface SelectedImportFile {
  name: string;
  size: number;
  contents: string;
  format: ImportFileFormat;
}

export interface ImportResult {
  added: number;
  skippedDuplicates: number;
  failed: number;
  errors: string[];
}

export interface ImportWizardState {
  step: ImportWizardStep;
  datasetMode: ImportDatasetMode;
  datasetId: string;
  newDatasetName: string;
  newDatasetDescription: string;
  file?: SelectedImportFile;
  columns: string[];
  previewRows: ImportRow[];
  mapping: ImportFieldMapping;
  examples: AddExamplesPayload[];
  validationErrors: ImportRowError[];
  blockingValidationErrors: string[];
  isImporting: boolean;
  result?: ImportResult;
}

export type ImportWizardAction =
  | { type: 'setDatasetMode'; mode: ImportDatasetMode }
  | { type: 'setDatasetId'; datasetId: string }
  | { type: 'setNewDatasetName'; name: string }
  | { type: 'setNewDatasetDescription'; description: string }
  | {
      type: 'selectFile';
      file: SelectedImportFile;
      preview: ParseImportFileResult;
      mapping: ImportFieldMapping;
    }
  | { type: 'clearFile' }
  | { type: 'setMapping'; column: string; destination: ImportFieldMapping[string] }
  | { type: 'next' }
  | { type: 'back' }
  | {
      type: 'validationReady';
      examples: AddExamplesPayload[];
      errors: ImportRowError[];
      blockingErrors: string[];
    }
  | { type: 'importStarted' }
  | { type: 'importFinished'; result: ImportResult };

export const createInitialState = (initialDatasetId?: string): ImportWizardState => ({
  step: 'file',
  datasetMode: 'existing',
  datasetId: initialDatasetId ?? '',
  newDatasetName: '',
  newDatasetDescription: '',
  columns: [],
  previewRows: [],
  mapping: {},
  examples: [],
  validationErrors: [],
  blockingValidationErrors: [],
  isImporting: false,
});

export const hasValidDestination = (state: ImportWizardState): boolean =>
  state.datasetMode === 'existing'
    ? state.datasetId.length > 0
    : state.newDatasetName.trim().length > 0;

export const hasValidMapping = (mapping: ImportFieldMapping): boolean =>
  Object.values(mapping).some((destination) => destination === 'input' || destination === 'output');

export const canAdvance = (state: ImportWizardState): boolean => {
  switch (state.step) {
    case 'file':
      return state.file !== undefined && hasValidDestination(state);
    case 'map':
      return hasValidMapping(state.mapping);
    case 'validate':
      return (
        state.examples.length > 0 &&
        state.blockingValidationErrors.length === 0 &&
        !state.isImporting
      );
    case 'result':
      return false;
  }
};

export const importWizardReducer = (
  state: ImportWizardState,
  action: ImportWizardAction
): ImportWizardState => {
  switch (action.type) {
    case 'setDatasetMode':
      return { ...state, datasetMode: action.mode };
    case 'setDatasetId':
      return { ...state, datasetId: action.datasetId };
    case 'setNewDatasetName':
      return { ...state, newDatasetName: action.name };
    case 'setNewDatasetDescription':
      return { ...state, newDatasetDescription: action.description };
    case 'selectFile':
      return {
        ...state,
        file: action.file,
        columns: action.preview.columns,
        previewRows: action.preview.rows.slice(0, MAX_PREVIEW_ROWS),
        mapping: action.mapping,
        examples: [],
        validationErrors: [],
        blockingValidationErrors: [],
        result: undefined,
      };
    case 'clearFile':
      return {
        ...state,
        file: undefined,
        columns: [],
        previewRows: [],
        mapping: {},
        examples: [],
        validationErrors: [],
        blockingValidationErrors: [],
      };
    case 'setMapping':
      return {
        ...state,
        mapping: { ...state.mapping, [action.column]: action.destination },
      };
    case 'next':
      if (!canAdvance(state)) {
        return state;
      }
      if (state.step === 'file') {
        return { ...state, step: 'map' };
      }
      return state;
    case 'validationReady':
      if (state.step !== 'map' || !hasValidMapping(state.mapping)) {
        return state;
      }
      return {
        ...state,
        step: 'validate',
        examples: action.examples,
        validationErrors: action.errors,
        blockingValidationErrors: action.blockingErrors,
      };
    case 'back':
      if (state.step === 'map') {
        return { ...state, step: 'file' };
      }
      if (state.step === 'validate') {
        return {
          ...state,
          step: 'map',
          examples: [],
          validationErrors: [],
          blockingValidationErrors: [],
        };
      }
      return state;
    case 'importStarted':
      if (state.step !== 'validate' || !canAdvance(state)) {
        return state;
      }
      return { ...state, isImporting: true };
    case 'importFinished':
      if (state.step !== 'validate') {
        return state;
      }
      return { ...state, step: 'result', isImporting: false, result: action.result };
  }
};
