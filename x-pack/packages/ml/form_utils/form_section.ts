/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isDefined } from '@kbn/ml-is-defined';
import { getNestedProperty } from '@kbn/ml-nested-property';

// Defining these sections is only necessary for options where a reset/deletion of that part of the
// configuration is supported by the API.

export interface FormSection<T extends string> {
  formSectionName: T;
  configFieldName: string | undefined;
  defaultEnabled: boolean;
  enabled: boolean;
}

export type FormSectionsState<FS extends string> = Record<FS, FormSection<FS>>;

export const initializeFormSection = <T extends string, C>(
  formSectionName: T,
  configFieldName?: string,
  config?: C,
  overloads?: Partial<FormSection<T>>
): FormSection<T> => {
  const defaultEnabled = overloads?.defaultEnabled ?? false;
  const rawEnabled = configFieldName && getNestedProperty(config ?? {}, configFieldName, undefined);
  const enabled = isDefined(rawEnabled) || defaultEnabled;

  return {
    formSectionName,
    configFieldName,
    defaultEnabled,
    enabled,
  };
};
