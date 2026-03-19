/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { isEmpty } from 'lodash/fp';
import { FieldType } from '../types/types';
import type { Config, ConfigEntryView, InferenceProvider } from '../types/types';
import type { OverrideFieldsContentType } from '../types/dynamic_config/types';
import * as LABELS from '../translations';

export interface TaskTypeOption {
  id: string;
  value: string;
  label: string;
}

export const getTaskTypeOptions = (taskTypes: string[]): TaskTypeOption[] =>
  taskTypes.map((taskType) => ({
    id: taskType,
    label: taskType,
    value: taskType,
  }));

export const generateInferenceEndpointId = (config: Config) => {
  const taskTypeSuffix = config.taskType ? `${config.taskType}-` : '';
  const inferenceEndpointId = `${config.provider}-${taskTypeSuffix}${Math.random()
    .toString(36)
    .slice(2)}`;
  return inferenceEndpointId;
};

export const getNonEmptyValidator = (
  requiredFieldsSchema: ConfigEntryView[],
  validationEventHandler: (fieldsWithErrors: ConfigEntryView[]) => void,
  isSubmitting: boolean = false,
  isSecrets: boolean = false
) => {
  return (...args: Parameters<ValidationFunc>): ReturnType<ValidationFunc> => {
    const [{ value, path }] = args;
    const updatedFormFields: ConfigEntryView[] = [];

    const configData = (value ?? {}) as Record<string, unknown>;
    let hasErrors = false;
    if (requiredFieldsSchema) {
      requiredFieldsSchema.map((field: ConfigEntryView) => {
        // validate if submitting or on field edit - value is not default to null
        if (field.required && (configData[field.key] !== null || isSubmitting)) {
          // validate secrets fields separately from regular
          if (isSecrets ? field.sensitive : !field.sensitive) {
            if (
              !configData[field.key] ||
              (typeof configData[field.key] === 'string' && isEmpty(configData[field.key]))
            ) {
              field.validationErrors = [LABELS.getRequiredMessage(field.label)];
              field.isValid = false;
              hasErrors = true;
            } else {
              field.validationErrors = [];
              field.isValid = true;
            }
          }
        }

        updatedFormFields.push(field);
      });

      validationEventHandler(updatedFormFields);
      if (hasErrors) {
        return {
          code: 'ERR_FIELD_MISSING',
          path,
          message: LABELS.getRequiredMessage('Action'),
        };
      }
    }
  };
};

export const mapProviderFields = (
  taskType: string,
  newProvider: InferenceProvider,
  fieldOverrides?: OverrideFieldsContentType
): ConfigEntryView[] => {
  // fieldOverrides.additional
  // e.g. [ { field: { default_value: 'value', ...}, other_field: { default_value: 'value', ...} } ]
  if (fieldOverrides?.additional) {
    fieldOverrides?.additional.forEach((additionalField) => {
      const fieldKey = Object.keys(additionalField)[0];
      if (!newProvider.configurations[fieldKey]) {
        newProvider.configurations[fieldKey] = additionalField[fieldKey];
      }
    });
  }

  return Object.keys(newProvider.configurations ?? {})
    .filter(
      (pk) =>
        (newProvider.configurations[pk].supported_task_types ?? [taskType]).includes(taskType) &&
        (fieldOverrides?.hidden ?? []).indexOf(pk) === -1
    )
    .map((k): ConfigEntryView => {
      // Use override defaultValues if provider config doesn't have a default_value set
      const configDefaultValue = newProvider.configurations[k].default_value;
      const overrideDefaultValue = fieldOverrides?.defaultValues?.[k];
      const resolvedDefaultValue = configDefaultValue ?? overrideDefaultValue ?? null;

      return {
        key: k,
        isValid: true,
        validationErrors: [],
        value: resolvedDefaultValue,
        default_value: resolvedDefaultValue,
        description: newProvider.configurations[k].description ?? null,
        label: newProvider.configurations[k].label ?? '',
        required: newProvider.configurations[k].required ?? false,
        sensitive: newProvider.configurations[k].sensitive ?? false,
        updatable: newProvider.configurations[k].updatable ?? false,
        type: newProvider.configurations[k].type ?? FieldType.STRING,
        supported_task_types: newProvider.configurations[k].supported_task_types ?? [],
      };
    });
};
