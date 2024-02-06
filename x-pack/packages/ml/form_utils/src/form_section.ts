/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isDefined } from '@kbn/ml-is-defined';
import { getNestedProperty } from '@kbn/ml-nested-property';
import type { Path } from 'react-hook-form';

// Defining these sections is only necessary for options where a reset/deletion of that part of the
// configuration is supported by the API.

export interface FormSection<FS extends string> {
  formSectionName: FS;
  configFieldName: string | undefined;
  defaultEnabled: boolean;
  enabled: boolean;
}

export function createFormSectionsMap<FS extends string>(formSections: Array<FormSection<FS>>) {
  return formSections.reduce<Record<FS, FormSection<FS>>>((acc, curr) => {
    acc[curr.formSectionName as FS] = curr as FormSection<FS>;
    return acc;
  }, {} as Record<FS, FormSection<FS>>);
}

export const createFormSection = <FS extends string, C extends object>(
  formSectionName: FS,
  configFieldName?: Path<C>,
  config?: C,
  overloads?: Partial<FormSection<FS>>
): FormSection<FS> => {
  const defaultEnabled = overloads?.defaultEnabled ?? false;
  const rawEnabled =
    configFieldName && getNestedProperty(config ?? {}, configFieldName as string, undefined);
  const enabled = isDefined(rawEnabled) || defaultEnabled;

  return {
    formSectionName,
    configFieldName: configFieldName as string | undefined,
    defaultEnabled,
    enabled,
  };
};
