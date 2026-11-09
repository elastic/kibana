/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateIndexNameRules } from '../../common';
import { createDatasetWizardStrings } from './create_dataset_wizard_i18n';

export const validateDatasetName =
  (existingDataSetNames: readonly string[]) =>
  (value: string): true | string => {
    if (!value) {
      return createDatasetWizardStrings.nameRequired;
    }

    const nameValidation = validateIndexNameRules(value);
    if (nameValidation) {
      return nameValidation.message;
    }

    return existingDataSetNames.includes(value)
      ? createDatasetWizardStrings.nameAlreadyExists
      : true;
  };

export const validateResource = (value: string): true | string => {
  try {
    new URL(value);
    return true;
  } catch {
    return value?.trim()
      ? createDatasetWizardStrings.resourceInvalid
      : createDatasetWizardStrings.resourceRequired;
  }
};
