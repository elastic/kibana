/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isDefined } from '@kbn/ml-is-defined';
import { getNestedProperty } from '@kbn/ml-nested-property';

import type { TransformConfigUnion } from '../../../../../common/types/transform';

// Defining these sections is only necessary for options where a reset/deletion of that part of the
// configuration is supported by the API. For example, this isn't suitable to use with `dest` since
// this overall part of the configuration is not optional. However, `retention_policy` is optional,
// so we need to support to recognize this based on the form state and be able to reset it by
// creating a request body containing `{ retention_policy: null }`.
export type FormSections = 'retentionPolicy';

export interface FormSection {
  formSectionName: FormSections;
  configFieldName: string;
  defaultEnabled: boolean;
  enabled: boolean;
}

export type FormSectionsState = Record<FormSections, FormSection>;

export const initializeFormSection = (
  formSectionName: FormSections,
  configFieldName: string,
  config?: TransformConfigUnion,
  overloads?: Partial<FormSection>
): FormSection => {
  const defaultEnabled = overloads?.defaultEnabled ?? false;
  const rawEnabled = getNestedProperty(config ?? {}, configFieldName, undefined);
  const enabled = isDefined(rawEnabled);

  return {
    formSectionName,
    configFieldName,
    defaultEnabled,
    enabled,
  };
};
