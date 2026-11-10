/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUnitSources, sourceTypeSelectsSignals, type SourceSignal } from './source_models';
import type { SourceType } from './types';
import type { Unit } from '../../../services/unit_repository';

export interface SourceCreationFormData {
  sourceType: SourceType;
  sourceName: string;
  signals: SourceSignal[];
}

export type SourceNameValidationError = 'required' | 'duplicate';

export interface SourceCreationFormErrors {
  sourceName?: SourceNameValidationError;
  signals?: 'required';
}

const normalizeSourceName = (sourceName: string): string => sourceName.trim().toLocaleLowerCase();

const getSourceNameValidationError = ({
  sourceName,
  unitDefinition,
}: {
  sourceName: string;
  unitDefinition: Unit;
}): SourceNameValidationError | undefined => {
  const normalizedSourceName = normalizeSourceName(sourceName);
  if (!normalizedSourceName) {
    return 'required';
  }

  return getUnitSources(unitDefinition).some(
    ({ name }) => name && normalizeSourceName(name) === normalizedSourceName
  )
    ? 'duplicate'
    : undefined;
};

export const getSourceCreationFormErrors = ({
  formData: { sourceName, sourceType, signals },
  unitDefinition,
}: {
  formData: SourceCreationFormData;
  unitDefinition: Unit;
}): SourceCreationFormErrors => ({
  sourceName: getSourceNameValidationError({ sourceName, unitDefinition }),
  signals: sourceTypeSelectsSignals(sourceType) && signals.length === 0 ? 'required' : undefined,
});

export const canSubmitSourceForm = ({
  formData,
  unitDefinition,
  availableSourceTypes,
}: {
  formData: SourceCreationFormData;
  unitDefinition: Unit;
  availableSourceTypes: readonly SourceType[];
}): boolean => {
  const { sourceName, signals } = getSourceCreationFormErrors({ formData, unitDefinition });
  return !sourceName && !signals && availableSourceTypes.includes(formData.sourceType);
};
