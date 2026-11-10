/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDatasetWizardStrings } from './create_dataset_wizard_i18n';
import { validateDatasetName, validateResource } from './validators';

describe('validateDatasetName', () => {
  const validate = (value: string, existingDataSetNames: readonly string[] = []) =>
    validateDatasetName(existingDataSetNames)(value);

  it('rejects an empty name', () => {
    expect(validate('')).toBe(createDatasetWizardStrings.nameRequired);
  });

  it('rejects a name that fails index-name rules', () => {
    expect(validate('Not-Lowercase')).toBe('Name must be lowercase.');
  });

  it('rejects a name that already exists', () => {
    expect(validate('logs-dataset', ['logs-dataset'])).toBe(
      createDatasetWizardStrings.nameAlreadyExists
    );
  });

  it('accepts a unique valid name', () => {
    expect(validate('logs-dataset', ['other-dataset'])).toBe(true);
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
