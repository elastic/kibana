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
  validateRemoteIndex,
  validateStaticSignalIndex,
} from './destination_models';
import { getDestinationTypeDefinition } from './destination_type_registry';
import { remoteElasticsearchCredentialName } from './remote_elasticsearch_constants';
import { getRemoteIndexBySignal } from './remote_elasticsearch_destination_models';
import { s3CredentialNames } from './s3_destination_models';
import type {
  DestinationCreationFormData,
  DestinationCreationFormErrors,
  DestinationSignal,
  ElasticsearchDestinationFormData,
  RemoteElasticsearchConnectionErrors,
  RemoteElasticsearchDestinationFormData,
  S3DestinationFormData,
  S3FieldsErrors,
} from './types';
import type { Unit } from '../../../services/unit_repository';

type RoutingErrors = Pick<
  DestinationCreationFormErrors,
  'staticIndexes' | 'logsIndex' | 'metricsIndex' | 'tracesIndex'
>;

const MAX_CREDENTIAL_NAME_LENGTH = 256;
const MAX_REMOTE_ENDPOINT_LENGTH = 2048;
// Format and default-ignorable characters are invisible, and `new URL()` drops them from the host.
const REMOTE_ENDPOINT_RAW_INVALID_CHARACTERS = /[\p{Cc}\p{Cf}\p{Default_Ignorable_Code_Point}\\]/u;
const REMOTE_ENDPOINT_WHITESPACE = /\p{White_Space}/u;
// `new URL()` repairs `https:example.com`, drops tabs and accepts `%` escapes that Go's `url.Parse`
// downstream rejects, so the raw shape is checked first.
const REMOTE_ENDPOINT_SHAPE = /^https:\/\/[^\s/?#@%]+(\/(?:[^\s?#%]|%[0-9A-Fa-f]{2})*)?$/;
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

/** Credential names derive from the node id, so the name can overflow or collide with them. */
const getCredentialNameError = ({
  destinationName,
  unitDefinition,
  getCredentialNames,
}: {
  destinationName: string;
  unitDefinition: Unit;
  getCredentialNames: (id: string) => string[];
}): 'tooLong' | 'credentialConflict' | undefined => {
  const id = createDestinationId({
    name: destinationName,
    existingIds: collectUnitComponentIds(unitDefinition.unit),
  });
  const credentialNames = getCredentialNames(id);
  if (credentialNames.some((name) => name.length > MAX_CREDENTIAL_NAME_LENGTH)) {
    return 'tooLong';
  }
  const referenced = collectReferencedCredentialNames(unitDefinition);
  return credentialNames.some((name) => referenced.has(name)) ? 'credentialConflict' : undefined;
};

const isPlainHttpsUrl = (endpoint: string): boolean => {
  try {
    const { protocol, username, password, search, hash } = new URL(endpoint);
    return protocol === 'https:' && !username && !password && !search && !hash;
  } catch {
    return false;
  }
};

/** A loop, because a `/ +$/` regex backtracks quadratically on a long run of spaces. */
const trimPlainSpaces = (value: string): string => {
  let start = 0;
  let end = value.length;
  while (start < end && value[start] === ' ') {
    start++;
  }
  while (end > start && value[end - 1] === ' ') {
    end--;
  }
  return value.slice(start, end);
};

/** Trims only plain spaces, so the value validated here is the value saved. */
export const validateRemoteEndpoint = (value: string): 'required' | 'invalid' | undefined => {
  if (REMOTE_ENDPOINT_RAW_INVALID_CHARACTERS.test(value)) {
    return 'invalid';
  }
  const endpoint = trimPlainSpaces(value);
  if (!endpoint) {
    return 'required';
  }
  if (
    endpoint.length > MAX_REMOTE_ENDPOINT_LENGTH ||
    REMOTE_ENDPOINT_WHITESPACE.test(endpoint) ||
    !REMOTE_ENDPOINT_SHAPE.test(endpoint)
  ) {
    return 'invalid';
  }
  return isPlainHttpsUrl(endpoint) ? undefined : 'invalid';
};

/** Matches the saved node's supported_telemetry: all three in Auto, the filled ones in Fixed. */
const getRemoteDestinationSignals = (
  remoteElasticsearch: ElasticsearchDestinationFormData
): readonly DestinationSignal[] => {
  if (remoteElasticsearch.auto) {
    return DESTINATION_SIGNALS;
  }
  const indexBySignal = getRemoteIndexBySignal(remoteElasticsearch);
  return DESTINATION_SIGNALS.filter((signal) => indexBySignal[signal]);
};

const getRemoteElasticsearchErrors = (
  remoteElasticsearch: RemoteElasticsearchDestinationFormData
): RemoteElasticsearchConnectionErrors & RoutingErrors => {
  const errors: RemoteElasticsearchConnectionErrors & RoutingErrors = {
    endpoint: validateRemoteEndpoint(remoteElasticsearch.endpoint),
    apiKey: remoteElasticsearch.apiKey.trim() ? undefined : 'required',
  };
  if (remoteElasticsearch.auto) {
    return errors;
  }
  if (getRemoteDestinationSignals(remoteElasticsearch).length === 0) {
    errors.staticIndexes = 'required';
  }
  for (const signal of DESTINATION_SIGNALS) {
    const field = SIGNAL_INDEX_FIELDS[signal];
    const error = validateRemoteIndex(remoteElasticsearch[field]);
    if (error) {
      errors[field] = error;
    }
  }
  return errors;
};

const getLocalElasticsearchErrors = (
  elasticsearch: ElasticsearchDestinationFormData
): RoutingErrors => {
  const errors: RoutingErrors = {};
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
  if (formData.storageKind === 'external_storage') {
    const destinationName =
      getDestinationNameValidationError({
        destinationName: formData.destinationName,
        unitDefinition,
        signals: DESTINATION_SIGNALS,
      }) ??
      getCredentialNameError({
        destinationName: formData.destinationName,
        unitDefinition,
        getCredentialNames: (id) => Object.values(s3CredentialNames(id)),
      });
    return { destinationName, ...getS3Errors(formData.s3) };
  }
  if (formData.storageKind === 'remote_elasticsearch') {
    const { remoteElasticsearch } = formData;
    const destinationName =
      getDestinationNameValidationError({
        destinationName: formData.destinationName,
        unitDefinition,
        signals: getRemoteDestinationSignals(remoteElasticsearch),
      }) ??
      getCredentialNameError({
        destinationName: formData.destinationName,
        unitDefinition,
        getCredentialNames: (id) => [remoteElasticsearchCredentialName(id)],
      });
    return { destinationName, ...getRemoteElasticsearchErrors(remoteElasticsearch) };
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
