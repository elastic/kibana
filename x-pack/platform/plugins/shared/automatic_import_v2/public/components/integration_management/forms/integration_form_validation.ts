/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import type { FormSchema } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { IntegrationFormData, IntegrationFields, DataStreamFields } from './types';
import * as i18n from './translations';

export const REQUIRED_FIELDS = [
  'title',
  'description',
  'connectorId',
  'dataStreamTitle',
  'dataStreamDescription',
  'dataCollectionMethod',
];

const { emptyField } = fieldValidators;

const titleToPackageName = (integrationTitle: string): string => {
  return integrationTitle.toLowerCase().replace(/[^a-z0-9]/g, '_');
};

const createUniqueTitleValidator = (
  packageNames: Set<string> | undefined,
  excludePackageName?: string
) => ({
  validator: ({ value }: { value: string }) => {
    const streamlinedTitle = titleToPackageName(value);
    if (!packageNames || !value) {
      return undefined;
    }
    // For existing integrations, exclude their own package name from the check
    if (excludePackageName && streamlinedTitle === excludePackageName) {
      return undefined;
    }
    if (packageNames.has(streamlinedTitle)) {
      return { message: i18n.TITLE_ALREADY_EXISTS };
    }
    return undefined;
  },
});

const logSampleRequiredValidator = () => ({
  validator: ({
    value,
    formData,
  }: {
    value: string | undefined;
    formData: { logsSourceOption: string };
  }) => {
    const isLogSampleProvided = value != null && value.trim();
    // Only require log sample value when upload option is selected
    if (formData.logsSourceOption === 'upload' && !isLogSampleProvided) {
      return { message: i18n.LOG_SAMPLE_REQUIRED };
    }
    return undefined;
  },
});

const selectedIndexRequiredValidator = () => ({
  validator: ({ value, formData }: { value: string; formData: { logsSourceOption: string } }) => {
    const isSelectedIndexProvided = value != null && value.trim();
    // Only require selected index when index option is selected
    if (formData.logsSourceOption === 'index' && !isSelectedIndexProvided) {
      return { message: i18n.SELECTED_INDEX_REQUIRED };
    }
    return undefined;
  },
});

const createIntegrationFieldsSchema = (
  packageNames: Set<string> | undefined,
  currentPackageName?: string
): FormSchema<IntegrationFields> => ({
  title: {
    label: 'Integration name',
    validations: [
      { validator: emptyField(i18n.TITLE_REQUIRED) },
      createUniqueTitleValidator(packageNames, currentPackageName),
    ],
  },
  description: {
    label: 'Description',
    validations: [{ validator: emptyField(i18n.DESCRIPTION_REQUIRED) }],
  },
  logo: {
    label: 'Logo',
    validations: [],
  },
  connectorId: {
    label: 'AI Connector',
    validations: [{ validator: emptyField(i18n.CONNECTOR_REQUIRED) }],
  },
});

const dataStreamFieldsSchema: FormSchema<DataStreamFields> = {
  dataStreamTitle: {
    label: 'Data stream title',
    validations: [{ validator: emptyField(i18n.DATA_STREAM_TITLE_REQUIRED) }],
  },
  dataStreamDescription: {
    label: 'Data stream description',
    validations: [{ validator: emptyField(i18n.DATA_STREAM_DESCRIPTION_REQUIRED) }],
  },
  dataCollectionMethod: {
    label: 'Data collection method',
    validations: [
      {
        validator: ({ value }: { value: string[] }) => {
          if (!value || value.length === 0) {
            return { message: i18n.DATA_COLLECTION_METHOD_REQUIRED };
          }
          return undefined;
        },
      },
    ],
  },
  logsSourceOption: {
    label: 'Logs source',
    validations: [],
  },
  logSample: {
    label: 'Log sample',
    validations: [logSampleRequiredValidator()],
  },
  selectedIndex: {
    label: 'Selected index',
    validations: [selectedIndexRequiredValidator()],
  },
};

/**
 * Create the form schema for integration management
 *
 * @param packageNames - Set of existing package names for uniqueness validation
 * @param currentIntegrationTitle - For existing integrations, their current title to exclude from uniqueness check
 * @returns The form schema with appropriate validations
 */
export const createFormSchema = (
  packageNames?: Set<string>,
  currentIntegrationTitle?: string
): FormSchema<IntegrationFormData> => {
  const currentPackageName = currentIntegrationTitle
    ? titleToPackageName(currentIntegrationTitle)
    : undefined;

  return {
    integrationId: { validations: [] },
    ...createIntegrationFieldsSchema(packageNames, currentPackageName),
    ...dataStreamFieldsSchema,
  };
};
