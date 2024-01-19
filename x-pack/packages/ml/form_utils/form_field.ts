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

export interface FormField<FF extends string, FS extends string, VN extends string> {
  formFieldName: FF;
  configFieldName: string | undefined;
  defaultValue: string;
  dependsOn: FF[];
  errors: string[];
  isNullable: boolean;
  isOptional: boolean;
  isOptionalInSection?: boolean;
  reservedValues?: string[];
  section?: FS;
  validator: VN;
  value: string;
  valueParser: ValueParserName;
}

export function createFormFieldsMap<FF extends string, FS extends string, VN extends string>(
  formFields: Array<FormField<FF, FS, VN>>
) {
  return formFields.reduce<Record<FF, FormField<FF, FS, VN>>>((acc, curr) => {
    acc[curr.formFieldName as FF] = curr as FormField<FF, FS, VN>;
    return acc;
  }, {} as Record<FF, FormField<FF, FS, VN>>);
}

export const initializeFormField = <FF extends string, FS extends string, VN extends string, C>(
  formFieldName: FF,
  configFieldName?: string,
  config?: C,
  overloads?: Partial<FormField<FF, FS, VN>>
): FormField<FF, FS, VN> => {
  const defaultValue = overloads?.defaultValue !== undefined ? overloads.defaultValue : '';
  const rawValue = configFieldName && getNestedProperty(config ?? {}, configFieldName, undefined);
  const value = rawValue !== null && rawValue !== undefined ? rawValue.toString() : '';

  return {
    formFieldName,
    configFieldName,
    defaultValue,
    dependsOn: [],
    errors: [],
    isNullable: false,
    isOptional: true,
    validator: 'stringValidator' as VN,
    value,
    valueParser: 'defaultParser',
    ...(overloads !== undefined ? { ...overloads } : {}),
  };
};
