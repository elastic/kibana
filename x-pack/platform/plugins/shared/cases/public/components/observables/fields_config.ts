/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';

import { getValidatorForObservableType } from '../../../common/observables/validators';

import {
  OBSERVABLE_TYPE_DOMAIN,
  OBSERVABLE_TYPE_EMAIL,
  OBSERVABLE_TYPE_IPV4,
  OBSERVABLE_TYPE_IPV6,
  OBSERVABLE_TYPE_URL,
} from '../../../common/constants';
import * as i18n from './translations';

const GENERIC_OBSERVABLE_VALUE_TYPE = 'generic' as const;

export const normalizeValueType = (
  observableTypeKey: string
): keyof typeof fieldsConfig.value | typeof GENERIC_OBSERVABLE_VALUE_TYPE => {
  if (observableTypeKey in fieldsConfig.value) {
    return observableTypeKey as keyof typeof fieldsConfig.value;
  }

  return GENERIC_OBSERVABLE_VALUE_TYPE;
};

const { emptyField } = fieldValidators;

interface FieldValidationConfig {
  validator: ValidationFunc;
}

const validationsFactory = (
  observableTypeKey: string | undefined,
  message: string = i18n.INVALID_VALUE
): FieldValidationConfig[] => [
  {
    validator: emptyField(i18n.REQUIRED_VALUE),
  },
  {
    validator: (...args: Parameters<ValidationFunc>) => {
      const [{ value, path }] = args;

      const validationResult = getValidatorForObservableType(observableTypeKey)(value);

      if (validationResult) {
        return {
          ...validationResult,
          message,
          path,
        };
      }
    },
  },
];

const observableValueFieldTypes = [
  {
    key: undefined,
    label: i18n.FIELD_LABEL_VALUE,
  },
  {
    key: OBSERVABLE_TYPE_EMAIL.key,
    label: 'Email',
  },
  {
    key: OBSERVABLE_TYPE_DOMAIN.key,
    label: 'Domain',
  },
  {
    key: OBSERVABLE_TYPE_IPV4.key,
    label: 'IPv4',
  },
  {
    key: OBSERVABLE_TYPE_IPV6.key,
    label: 'IPv6',
  },
  {
    key: OBSERVABLE_TYPE_URL.key,
    label: 'URL',
  },
];

const fieldsValueConfigsPerObservableType = observableValueFieldTypes.reduce(
  (fieldsConfig, valueFieldConfig) => {
    fieldsConfig[valueFieldConfig.key ?? GENERIC_OBSERVABLE_VALUE_TYPE] = {
      label: valueFieldConfig.label,
      validations: validationsFactory(valueFieldConfig.key),
    };

    return fieldsConfig;
  },
  {} as Record<string, { label: string; validations: FieldValidationConfig[] }>
);

export const fieldsConfig = {
  value: fieldsValueConfigsPerObservableType,
  typeKey: {
    validations: [
      {
        validator: emptyField(i18n.REQUIRED_VALUE),
      },
    ],
    label: i18n.FIELD_LABEL_TYPE,
  },
  description: {
    label: i18n.FIELD_LABEL_DESCRIPTION,
  },
};
