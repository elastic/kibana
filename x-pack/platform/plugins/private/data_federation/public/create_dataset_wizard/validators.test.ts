/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDatasetFormStrings } from './create_dataset_form_i18n';
import { validateDatasetName } from './validators';

describe('validateDatasetName', () => {
  const validate = (
    value: string,
    overrides: Partial<Parameters<typeof validateDatasetName>[0]> = {
      existingDataSetNames: [],
      isEditMode: false,
      datasetNameToEdit: '',
    }
  ) =>
    validateDatasetName({
      existingDataSetNames: [],
      isEditMode: false,
      datasetNameToEdit: '',
      ...overrides,
    })(value);

  it('rejects an empty name', () => {
    expect(validate('')).toBe(createDatasetFormStrings.nameRequired());
  });

  it('rejects a name that fails index-name rules', () => {
    expect(validate('Not-Lowercase')).toBe('Name must be lowercase.');
  });

  it('rejects a name that already exists', () => {
    expect(validate('logs-dataset', { existingDataSetNames: ['logs-dataset'] })).toBe(
      createDatasetFormStrings.nameAlreadyExists()
    );
  });

  it('allows the current dataset name while editing', () => {
    expect(
      validate('logs-dataset', {
        existingDataSetNames: ['logs-dataset'],
        isEditMode: true,
        datasetNameToEdit: 'logs-dataset',
      })
    ).toBe(true);
  });

  it('accepts a unique valid name', () => {
    expect(
      validate('logs-dataset', {
        existingDataSetNames: ['other-dataset'],
        isEditMode: false,
        datasetNameToEdit: '',
      })
    ).toBe(true);
  });
});
