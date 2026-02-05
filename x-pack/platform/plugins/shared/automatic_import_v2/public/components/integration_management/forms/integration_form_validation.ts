/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import type { FormSchema } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { IntegrationFormData } from './types';
import { MAX_DESCRIPTION_LENGTH, MAX_NAME_LENGTH } from './constants';
import * as i18n from './translations';

const { emptyField, maxLengthField } = fieldValidators;

// Helper to mark a field as required with the emptyField validator
// since all validations against empty fields means field is required.
// Move to separate helper file when we have edit datastream forms.
export const requiredField = (message: string) => ({
  validator: emptyField(message),
  isRequired: true,
});

const titleToPackageName = (integrationTitle: string): string => {
  return integrationTitle.toLowerCase().replace(/[^a-z0-9]/g, '_');
};

const createUniqueTitleValidator = (packageNames: Set<string> | undefined) => ({
  validator: ({ value }: { value: string }) => {
    const streamlinedTitle = titleToPackageName(value);
    if (!packageNames || !value) {
      return undefined;
    }
    if (packageNames.has(streamlinedTitle)) {
      return { message: i18n.TITLE_ALREADY_EXISTS };
    }
    return undefined;
  },
});

export const createIntegrationFormSchema = (
  packageNames: Set<string> | undefined
): FormSchema<IntegrationFormData> => ({
  title: {
    label: 'Integration name',
    validations: [
      requiredField(i18n.TITLE_REQUIRED),
      {
        validator: maxLengthField({
          length: MAX_NAME_LENGTH,
          message: i18n.TITLE_MAX_LENGTH,
        }),
      },
      createUniqueTitleValidator(packageNames),
    ],
  },
  description: {
    label: 'Description',
    validations: [
      requiredField(i18n.DESCRIPTION_REQUIRED),
      {
        validator: maxLengthField({
          length: MAX_DESCRIPTION_LENGTH,
          message: i18n.DESCRIPTION_MAX_LENGTH,
        }),
      },
    ],
  },
  // Logo svgs are validated in the processLogoFile function at upload time.
  logo: {
    label: 'Logo',
    validations: [],
  },
  connectorId: {
    label: 'AI Connector',
    validations: [requiredField(i18n.CONNECTOR_REQUIRED)],
  },
});

export const IntegrationFormSchema = createIntegrationFormSchema(undefined);
