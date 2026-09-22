/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDestinationNameValidationError } from './destination_helpers';
import { indexUsesTemplate, parseIndexPatterns } from './destination_models';
import { getDestinationTypeDefinition } from './destination_type_registry';
import type {
  DestinationCreationFormData,
  DestinationCreationFormErrors,
  ElasticsearchDestinationFormData,
} from './types';
import type { Unit } from '../../../services/unit_repository';

const getLocalElasticsearchErrors = (
  elasticsearch: ElasticsearchDestinationFormData
): Pick<DestinationCreationFormErrors, 'index' | 'indexPatterns'> => {
  const errors: Pick<DestinationCreationFormErrors, 'index' | 'indexPatterns'> = {};
  const index = elasticsearch.index.trim();
  if (!index) {
    errors.index = 'required';
  }
  if (index && indexUsesTemplate(index)) {
    const patterns = parseIndexPatterns(elasticsearch.indexPatterns);
    if (patterns.length === 0) {
      errors.indexPatterns = 'required';
    } else if (new Set(patterns).size !== patterns.length) {
      errors.indexPatterns = 'invalid';
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
  return !errors.destinationName && !errors.index && !errors.indexPatterns;
};
