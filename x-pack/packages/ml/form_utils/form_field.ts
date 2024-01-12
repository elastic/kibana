/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNestedProperty } from '@kbn/ml-nested-property';

import type { ValueParserName } from './value_parsers';

// The form state defines a flat structure of names for form fields.
// This is a flat structure regardless of whether the final config object will be nested.

export type FormFieldsState<FF extends string, FS extends string, VN extends string> = Record<
  FF,
  FormField<FF, FS, VN>
>;

export interface FormField<FF extends string, FS extends string, VN extends string> {
  formFieldName: FF;
  configFieldName: string;
  defaultValue: string;
  dependsOn: FF[];
  errorMessages: string[];
  isNullable: boolean;
  isOptional: boolean;
  isOptionalInSection?: boolean;
  section?: FS;
  validator: VN;
  value: string;
  valueParser: ValueParserName;
}

export const initializeFormField = <FF extends string, FS extends string, VN extends string, C>(
  formFieldName: FF,
  configFieldName: string,
  config?: C,
  overloads?: Partial<FormField<FF, FS, VN>>
): FormField<FF, FS, VN> => {
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
    validator: 'stringValidator' as VN,
    value,
    valueParser: 'defaultParser',
    ...(overloads !== undefined ? { ...overloads } : {}),
  };
};
