/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { canAdvance, createInitialState, importWizardReducer, MAX_PREVIEW_ROWS } from './reducer';

const selectedFile = {
  name: 'examples.csv',
  size: 20,
  contents: 'input,output\nhello,world',
  format: 'csv' as const,
};

describe('import dataset flyout reducer', () => {
  it('does not advance without a file', () => {
    const state = { ...createInitialState(), datasetId: 'dataset-1' };

    expect(canAdvance(state)).toBe(false);
    expect(importWizardReducer(state, { type: 'next' })).toBe(state);
  });

  it('does not advance until an existing or new dataset is selected', () => {
    const state = importWizardReducer(createInitialState(), {
      type: 'selectFile',
      file: selectedFile,
      preview: { columns: ['input'], rows: [], errors: [] },
      mapping: { input: 'input' },
    });

    expect(canAdvance(state)).toBe(false);
    expect(canAdvance({ ...state, datasetMode: 'new', newDatasetName: 'Imported examples' })).toBe(
      true
    );
  });

  it('does not leave the mapping step without input or output mapping', () => {
    const fileState = importWizardReducer(createInitialState('dataset-1'), {
      type: 'selectFile',
      file: selectedFile,
      preview: { columns: ['notes'], rows: [], errors: [] },
      mapping: { notes: 'metadata' },
    });
    const mapState = importWizardReducer(fileState, { type: 'next' });
    const nextState = importWizardReducer(mapState, {
      type: 'validationReady',
      examples: [{ metadata: { notes: 'hello' } }],
      errors: [],
      blockingErrors: [],
    });

    expect(mapState.step).toBe('map');
    expect(canAdvance(mapState)).toBe(false);
    expect(nextState).toBe(mapState);
  });

  it('advances through mapping when input or output is mapped', () => {
    const fileState = importWizardReducer(createInitialState('dataset-1'), {
      type: 'selectFile',
      file: selectedFile,
      preview: { columns: ['prompt'], rows: [], errors: [] },
      mapping: { prompt: 'input' },
    });
    const mapState = importWizardReducer(fileState, { type: 'next' });
    const validateState = importWizardReducer(mapState, {
      type: 'validationReady',
      examples: [{ input: { prompt: 'hello' } }],
      errors: [],
      blockingErrors: [],
    });

    expect(canAdvance(mapState)).toBe(true);
    expect(validateState.step).toBe('validate');
    expect(canAdvance(validateState)).toBe(true);
  });

  it('keeps only the first preview rows when selecting a file', () => {
    const rows = Array.from({ length: MAX_PREVIEW_ROWS + 1 }, (_, index) => ({
      rowNumber: index + 1,
      values: { prompt: `row-${index + 1}` },
    }));
    const state = importWizardReducer(createInitialState('dataset-1'), {
      type: 'selectFile',
      file: selectedFile,
      preview: { columns: ['prompt'], rows, errors: [] },
      mapping: { prompt: 'input' },
    });

    expect(state.previewRows).toHaveLength(MAX_PREVIEW_ROWS);
    expect(state.previewRows[0].rowNumber).toBe(1);
    expect(state.previewRows[MAX_PREVIEW_ROWS - 1].rowNumber).toBe(MAX_PREVIEW_ROWS);
  });

  it('does not import when validation has a blocking error', () => {
    const state = {
      ...createInitialState('dataset-1'),
      step: 'map' as const,
      mapping: { prompt: 'input' as const },
    };
    const validateState = importWizardReducer(state, {
      type: 'validationReady',
      examples: [{ input: { prompt: 'hello' } }],
      errors: [],
      blockingErrors: ['Dataset capacity exceeded'],
    });

    expect(validateState.step).toBe('validate');
    expect(canAdvance(validateState)).toBe(false);
  });
});
