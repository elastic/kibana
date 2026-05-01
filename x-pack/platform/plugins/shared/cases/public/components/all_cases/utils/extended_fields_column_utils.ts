/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { startCase } from 'lodash';

import type { CaseUI } from '../../../../common/ui/types';

export const labelFromExtendedFieldKey = (key: string): string =>
  startCase(key.replace(/_as_[a-z0-9_]+$/, '').replace(/As[A-Z][a-zA-Z0-9]*$/, ''));

export const getExtendedFieldDisplayLabels = (
  extendedFields: CaseUI['extendedFields'] | undefined,
  extendedFieldsLabels: CaseUI['extendedFieldsLabels'] | undefined
): string[] => {
  if (!extendedFields) {
    return [];
  }

  return Object.keys(extendedFields).map(
    (key) => extendedFieldsLabels?.[key] ?? labelFromExtendedFieldKey(key)
  );
};
