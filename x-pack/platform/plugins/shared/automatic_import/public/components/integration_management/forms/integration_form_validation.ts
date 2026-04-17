/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import type { FormSchema } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  normalizeTitleName,
  isValidNameFormat,
  isNotPurelyNumeric,
  startsWithLetter,
  meetsMinLength,
  meetsMaxLength,
} from '../../../common/lib/helper_functions';
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

const nameFormatField =
  (message: string) =>
  ({ value }: { value: string }) => {
    if (!value || !value.trim()) {
      return undefined;
    }
    if (!isValidNameFormat(value)) {
      return { code: 'ERR_FIELD_FORMAT' as const, message };
    }
    return undefined;
  };

const notPurelyNumericField =
  (message: string) =>
  ({ value }: { value: string }) => {
    if (!value || !value.trim()) {
      return undefined;
    }
    if (!isNotPurelyNumeric(value)) {
      return { code: 'ERR_FIELD_FORMAT' as const, message };
    }
    return undefined;
  };

const startsWithLetterField =
  (message: string) =>
  ({ value }: { value: string }) => {
    if (!value || !value.trim()) {
      return undefined;
    }
    if (!startsWithLetter(value)) {
      return { code: 'ERR_FIELD_FORMAT' as const, message };
    }
    return undefined;
  };

const minLengthField =
  (message: string) =>
  ({ value }: { value: string }) => {
    if (!value || !value.trim()) {
      return undefined;
    }
    if (!meetsMinLength(value)) {
      return { code: 'ERR_MIN_LENGTH' as const, message };
    }
    return undefined;
  };

const maxLengthField =
  (message: string) =>
  ({ value }: { value: string }) => {
    if (!value || !value.trim()) {
      return undefined;
    }
    if (!meetsMaxLength(value)) {
      return { code: 'ERR_MAX_LENGTH' as const, message };
    }
    return undefined;
  };

const createUniqueTitleValidator = (
  packageNames: Set<string> | undefined,
  excludePackageName?: string
) => ({
  validator: ({ value }: { value: string }) => {
    const normalizedTitle = normalizeTitleName(value);
    if (!packageNames || !value) {
      return undefined;
    }
    // For existing integrations, exclude their own package name from the check
    if (excludePackageName && normalizedTitle === excludePackageName) {
      return undefined;
    }
    if (packageNames.has(normalizedTitle)) {
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
    if (formData.logsSourceOption === 'file' && !isLogSampleProvided) {
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

const createUniqueDataStreamTitleValidator = (existingDataStreamTitles?: Set<string>) => ({
  validator: ({ value }: { value: string }) => {
    const normalizedTitle = normalizeTitleName(value ?? '');
    if (!existingDataStreamTitles || !normalizedTitle) {
      return undefined;
    }
    if (existingDataStreamTitles.has(normalizedTitle)) {
      return { message: i18n.DATA_STREAM_TITLE_ALREADY_EXISTS };
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
      { validator: minLengthField(i18n.NAME_TOO_SHORT) },
      { validator: maxLengthField(i18n.NAME_TOO_LONG) },
      { validator: nameFormatField(i18n.NAME_INVALID_FORMAT) },
      { validator: startsWithLetterField(i18n.NAME_MUST_START_WITH_LETTER) },
      { validator: notPurelyNumericField(i18n.NAME_CANNOT_BE_PURELY_NUMERIC) },
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

const createDataStreamFieldsSchema = (
  existingDataStreamTitles?: Set<string>
): FormSchema<DataStreamFields> => ({
  dataStreamTitle: {
    label: 'Data stream title',
    validations: [
      { validator: emptyField(i18n.DATA_STREAM_TITLE_REQUIRED) },
      { validator: minLengthField(i18n.NAME_TOO_SHORT) },
      { validator: maxLengthField(i18n.NAME_TOO_LONG) },
      { validator: nameFormatField(i18n.NAME_INVALID_FORMAT) },
      { validator: startsWithLetterField(i18n.NAME_MUST_START_WITH_LETTER) },
      { validator: notPurelyNumericField(i18n.NAME_CANNOT_BE_PURELY_NUMERIC) },
      createUniqueDataStreamTitleValidator(existingDataStreamTitles),
    ],
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
});

/**
 * Create the form schema for integration management
 *
 * @param packageNames - Set of existing package names for uniqueness validation
 * @param currentIntegrationTitle - For existing integrations, their current title to exclude from uniqueness check
 * @param existingDataStreamTitles - Set of existing data stream titles for uniqueness validation (case-insensitive)
 * @returns The form schema with appropriate validations
 */
export const createFormSchema = (
  packageNames?: Set<string>,
  currentIntegrationTitle?: string,
  existingDataStreamTitles?: Set<string>
): FormSchema<IntegrationFormData> => {
  const currentPackageName = currentIntegrationTitle
    ? normalizeTitleName(currentIntegrationTitle)
    : undefined;

  return {
    integrationId: { validations: [] },
    ...createIntegrationFieldsSchema(packageNames, currentPackageName),
    ...createDataStreamFieldsSchema(existingDataStreamTitles),
  };
};
