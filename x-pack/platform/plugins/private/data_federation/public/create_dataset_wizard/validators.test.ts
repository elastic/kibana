/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDatasetWizardStrings } from './create_dataset_wizard_i18n';
import { validateDatasetName, validateResource } from './validators';

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
    expect(validate('')).toBe(createDatasetWizardStrings.nameRequired);
  });

  it('rejects a name that fails index-name rules', () => {
    expect(validate('Not-Lowercase')).toBe('Name must be lowercase.');
  });

  it('rejects a name that already exists', () => {
    expect(validate('logs-dataset', { existingDataSetNames: ['logs-dataset'] })).toBe(
      createDatasetWizardStrings.nameAlreadyExists
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

describe('validateResource', () => {
  it('rejects an empty resource', () => {
    expect(validateResource('')).toBe(createDatasetWizardStrings.resourceRequired);
    expect(validateResource('   ')).toBe(createDatasetWizardStrings.resourceRequired);
  });

  it('rejects a string that is not a URI', () => {
    expect(validateResource('bucket/*')).toBe(createDatasetWizardStrings.resourceInvalid);
  });

  it('accepts a string the URL constructor accepts', () => {
    expect(validateResource('s3://logs-bucket/access/**/*.parquet')).toBe(true);
  });
});
