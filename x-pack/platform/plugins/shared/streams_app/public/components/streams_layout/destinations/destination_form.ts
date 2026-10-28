/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { collectUnitComponentIds } from '@kbn/streams-schema';
import { createDestinationId, getDestinationNameValidationError } from './destination_helpers';
import {
  DESTINATION_SIGNALS,
  getFormDestinationSignals,
  SIGNAL_INDEX_FIELDS,
  validateAutoWritePattern,
  validateStaticSignalIndex,
} from './destination_models';
import { getDestinationTypeDefinition } from './destination_type_registry';
import { s3CredentialNames } from './s3_destination_models';
import { getVisibleFormErrors } from '../visible_form_errors';
import type {
  DestinationCreationFormData,
  DestinationCreationFormErrors,
  DestinationCreationFormField,
  ElasticsearchDestinationFormData,
  S3DestinationFormData,
  S3FieldsErrors,
} from './types';
import type { Unit } from '../../../services/unit_repository';

const MAX_CREDENTIAL_NAME_LENGTH = 256;
const S3_BUCKET_MIN_LENGTH = 3;
const S3_BUCKET_MAX_LENGTH = 63;

const getS3Errors = (s3: S3DestinationFormData): S3FieldsErrors => {
  const bucket = s3.bucket.trim();
  return {
    region: s3.region.trim() ? undefined : 'required',
    bucket: !bucket
      ? 'required'
      : bucket.length < S3_BUCKET_MIN_LENGTH || bucket.length > S3_BUCKET_MAX_LENGTH
      ? 'invalid'
      : undefined,
    accessKeyId: s3.accessKeyId.trim() ? undefined : 'required',
    secretAccessKey: s3.secretAccessKey.trim() ? undefined : 'required',
  };
};

const collectReferencedCredentialNames = (unitDefinition: Unit): Set<string> => {
  const { sources = [], processors = [], destinations = [] } = unitDefinition.unit;
  const names = new Set<string>();
  for (const component of [...sources, ...processors, ...destinations]) {
    for (const { value } of component.config ?? []) {
      if (
        typeof value === 'object' &&
        value !== null &&
        'credential' in value &&
        typeof value.credential === 'string'
      ) {
        names.add(value.credential);
      }
    }
  }
  return names;
};

/** S3 credential names derive from the node id, so the name can overflow or collide with them. */
const getS3NameError = ({
  destinationName,
  unitDefinition,
}: {
  destinationName: string;
  unitDefinition: Unit;
}): 'tooLong' | 'credentialConflict' | undefined => {
  const id = createDestinationId({
    name: destinationName,
    existingIds: collectUnitComponentIds(unitDefinition.unit),
  });
  const credentialNames = s3CredentialNames(id);
  if (credentialNames.secretAccessKey.length > MAX_CREDENTIAL_NAME_LENGTH) {
    return 'tooLong';
  }
  const referenced = collectReferencedCredentialNames(unitDefinition);
  return Object.values(credentialNames).some((name) => referenced.has(name))
    ? 'credentialConflict'
    : undefined;
};

type LocalElasticsearchErrors = Pick<
  DestinationCreationFormErrors,
  'staticIndexes' | 'customSignals' | 'logsIndex' | 'metricsIndex' | 'tracesIndex'
>;

const getLocalElasticsearchErrors = (
  elasticsearch: ElasticsearchDestinationFormData
): LocalElasticsearchErrors => {
  const errors: LocalElasticsearchErrors = {};
  if (elasticsearch.auto) {
    if (!elasticsearch.useCustomWritePatterns) {
      return errors;
    }
    if (elasticsearch.customSignals.length === 0) {
      errors.customSignals = 'required';
    }
    for (const signal of elasticsearch.customSignals) {
      const field = SIGNAL_INDEX_FIELDS[signal];
      const error = elasticsearch[field].trim()
        ? validateAutoWritePattern(signal, elasticsearch[field])
        : 'required';
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
  for (const signal of DESTINATION_SIGNALS) {
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
  if (formData.storageKind === 'external_storage') {
    const destinationName =
      getDestinationNameValidationError({
        destinationName: formData.destinationName,
        unitDefinition,
        signals: DESTINATION_SIGNALS,
      }) ?? getS3NameError({ destinationName: formData.destinationName, unitDefinition });
    return { destinationName, ...getS3Errors(formData.s3) };
  }
  const errors: DestinationCreationFormErrors = {
    destinationName: getDestinationNameValidationError({
      destinationName: formData.destinationName,
      unitDefinition,
      signals: getFormDestinationSignals(formData.elasticsearch),
    }),
  };
  return { ...errors, ...getLocalElasticsearchErrors(formData.elasticsearch) };
};

type FormFieldPath =
  | 'destinationName'
  | `elasticsearch.${keyof ElasticsearchDestinationFormData}`
  | `s3.${keyof S3DestinationFormData}`;

/** Form inputs whose touched state reveals each error. */
const ERROR_FIELD_PATHS: Record<DestinationCreationFormField, readonly FormFieldPath[]> = {
  destinationName: ['destinationName'],
  staticIndexes: [
    'elasticsearch.logsIndex',
    'elasticsearch.metricsIndex',
    'elasticsearch.tracesIndex',
  ],
  customSignals: ['elasticsearch.customSignals'],
  logsIndex: ['elasticsearch.logsIndex'],
  metricsIndex: ['elasticsearch.metricsIndex'],
  tracesIndex: ['elasticsearch.tracesIndex'],
  region: ['s3.region'],
  bucket: ['s3.bucket'],
  accessKeyId: ['s3.accessKeyId'],
  secretAccessKey: ['s3.secretAccessKey'],
};

export const getVisibleDestinationFormErrors = ({
  errors,
  touchedFields,
  isSubmitted,
}: {
  errors: DestinationCreationFormErrors;
  touchedFields: object;
  isSubmitted: boolean;
}): DestinationCreationFormErrors =>
  getVisibleFormErrors({ errors, touchedFields, isSubmitted, fieldPaths: ERROR_FIELD_PATHS });

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
  return Object.values(errors).every((error) => !error);
};
