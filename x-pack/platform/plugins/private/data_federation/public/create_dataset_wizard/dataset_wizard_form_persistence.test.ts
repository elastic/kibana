/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { emptyDatasetWizardFormValues } from './dataset_wizard_form_state';
import {
  clearWizardFormDraft,
  getWizardFormDraftStorageKey,
  isDatasetWizardFormValues,
  loadWizardFormDraft,
  mergeWizardFormValues,
  saveWizardFormDraft,
} from './dataset_wizard_form_persistence';

describe('dataset_wizard_form_persistence', () => {
  const createKey = getWizardFormDraftStorageKey(false);
  const editKey = getWizardFormDraftStorageKey(true, 'my-dataset');

  beforeEach(() => {
    sessionStorage.clear();
  });

  it('uses separate storage keys for create and edit flows', () => {
    expect(createKey).toBe('dataFederation.datasetWizard.create');
    expect(editKey).toBe('dataFederation.datasetWizard.edit.my-dataset');
  });

  it('saves and loads a wizard draft', () => {
    const draft = {
      ...emptyDatasetWizardFormValues(),
      name: 'draft-dataset',
      resource: 's3://bucket/data.csv',
      settings: {
        ...emptyDatasetWizardFormValues().settings,
        format: 'csv' as const,
      },
    };

    saveWizardFormDraft(createKey, draft);

    expect(loadWizardFormDraft(createKey)).toEqual(draft);
  });

  it('returns undefined for invalid stored drafts', () => {
    sessionStorage.setItem(createKey, '{"name":123}');
    expect(loadWizardFormDraft(createKey)).toBeUndefined();
  });

  it('clears stored drafts', () => {
    saveWizardFormDraft(createKey, emptyDatasetWizardFormValues());
    clearWizardFormDraft(createKey);
    expect(loadWizardFormDraft(createKey)).toBeUndefined();
  });

  it('merges draft values over the base form state', () => {
    const base = emptyDatasetWizardFormValues();
    const draft = {
      ...base,
      name: 'draft-dataset',
      settings: {
        ...base.settings,
        delimiter: ',',
      },
    };

    expect(mergeWizardFormValues(base, draft)).toEqual(draft);
    expect(isDatasetWizardFormValues(draft)).toBe(true);
  });
});
