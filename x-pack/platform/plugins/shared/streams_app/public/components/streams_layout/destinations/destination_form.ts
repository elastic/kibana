/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDestinationNameValidationError } from './destination_helpers';
import {
  getFormDestinationSignals,
  SIGNAL_INDEX_FIELDS,
  validateAutoWritePattern,
  validateStaticSignalIndex,
} from './destination_models';
import { getDestinationTypeDefinition } from './destination_type_registry';
import type {
  DestinationCreationFormData,
  DestinationCreationFormErrors,
  ElasticsearchDestinationFormData,
} from './types';
import type { Unit } from '../../../services/unit_repository';

const getLocalElasticsearchErrors = (
  elasticsearch: ElasticsearchDestinationFormData
): Pick<
  DestinationCreationFormErrors,
  'staticIndexes' | 'logsIndex' | 'metricsIndex' | 'tracesIndex'
> => {
  const errors: Pick<
    DestinationCreationFormErrors,
    'staticIndexes' | 'logsIndex' | 'metricsIndex' | 'tracesIndex'
  > = {};
  if (elasticsearch.auto) {
    for (const signal of ['logs', 'metrics', 'traces'] as const) {
      const field = SIGNAL_INDEX_FIELDS[signal];
      const error = validateAutoWritePattern(signal, elasticsearch[field]);
      if (error) {
        errors[field] = error;
      }
    }
    return errors;
  }
  const hasIndex = Object.values(SIGNAL_INDEX_FIELDS).some(
    (field) => elasticsearch[field].trim().length > 0
  );
  if (!hasIndex) {
    errors.staticIndexes = 'required';
  }
  for (const signal of ['logs', 'metrics', 'traces'] as const) {
    const field = SIGNAL_INDEX_FIELDS[signal];
    const error = validateStaticSignalIndex(signal, elasticsearch[field]);
    if (error) {
      errors[field] = error;
    }
  }
  return errors;
};

export const getDestinationCreationFormErrors = ({
  formData,
  unitDefinition,
}: {
  formData: DestinationCreationFormData;
  unitDefinition: Unit;
}): DestinationCreationFormErrors => {
  const errors: DestinationCreationFormErrors = {
    destinationName: getDestinationNameValidationError({
      destinationName: formData.destinationName,
      unitDefinition,
      signals: getFormDestinationSignals(formData.elasticsearch),
    }),
  };
  if (formData.storageKind !== 'local_elasticsearch') {
    return errors;
  }
  return { ...errors, ...getLocalElasticsearchErrors(formData.elasticsearch) };
};

export const canSubmitDestinationForm = ({
  formData,
  unitDefinition,
}: {
  formData: DestinationCreationFormData;
  unitDefinition: Unit;
}): boolean => {
  if (!getDestinationTypeDefinition(formData.storageKind).available) {
    return false;
  }
  if (!formData.destinationName.trim()) {
    return false;
  }
  const errors = getDestinationCreationFormErrors({ formData, unitDefinition });
  return (
    !errors.destinationName &&
    !errors.staticIndexes &&
    !errors.logsIndex &&
    !errors.metricsIndex &&
    !errors.tracesIndex
  );
};
