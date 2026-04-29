/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNestedProperty } from '@kbn/ml-nested-property';

import type { TransformConfigUnion } from '../../../../../common/types/transform';

import type { FormSections } from './form_section';
import type { ValidatorName } from './validators';
import type { ValueParserName } from './value_parsers';

// The form state defines a flat structure of names for form fields.
// This is a flat structure regardless of whether the final config object will be nested.
// For example, `destinationIndex` and `destinationIngestPipeline` will later be nested under `dest`.
export type FormFields =
  | 'description'
  | 'destinationIndex'
  | 'destinationIngestPipeline'
  | 'docsPerSecond'
  | 'frequency'
  | 'maxPageSearchSize'
  | 'numFailureRetries'
  | 'retentionPolicyField'
  | 'retentionPolicyMaxAge';

export type FormFieldsState = Record<FormFields, FormField>;

export interface FormField {
  formFieldName: FormFields;
  configFieldName: string;
  defaultValue: string;
  dependsOn: FormFields[];
  errorMessages: string[];
  isNullable: boolean;
  isOptional: boolean;
  isOptionalInSection?: boolean;
  section?: FormSections;
  validator: ValidatorName;
  value: string;
  valueParser: ValueParserName;
}

export const initializeFormField = (
  formFieldName: FormFields,
  configFieldName: string,
  config?: TransformConfigUnion,
  overloads?: Partial<FormField>
): FormField => {
  const defaultValue = overloads?.defaultValue !== undefined ? overloads.defaultValue : '';
  const rawValue = getNestedProperty(config ?? {}, configFieldName, undefined);
  const value = rawValue !== null && rawValue !== undefined ? rawValue.toString() : '';

  return {
    formFieldName,
    configFieldName,
    defaultValue,
    dependsOn: [],
    errorMessages: [],
    isNullable: false,
    isOptional: true,
    validator: 'stringValidator',
    value,
    valueParser: 'defaultParser',
    ...(overloads !== undefined ? { ...overloads } : {}),
  };
};
