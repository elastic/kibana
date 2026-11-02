/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnitDestinationSignal, UnitDestinationSignalTargets } from '@kbn/streams-schema';
import type { DestinationNameValidationError } from './destination_helpers';
/**
 * Destination storage choices shown in the create form.
 * Only `local_elasticsearch` is persisted today. Add a kind here, a fields
 * component, and a registry entry to introduce another type.
 */
export type DestinationStorageKind = 'local_elasticsearch' | 'external_storage';

/** Unit destination types the UI can list and create. */
export type DestinationType = 'elasticsearch' | 's3';

export type DestinationSignal = UnitDestinationSignal;
/** How an Elasticsearch destination chooses its indices. */
export type DestinationIndexMode = 'static' | 'auto';

export type StaticIndexValidationError =
  | 'template'
  | 'invalidName'
  | 'uppercase'
  | 'invalidCharacter'
  | 'signalPattern';

export type AutoWritePatternValidationError =
  | 'required'
  | 'uppercase'
  | 'invalidCharacter'
  | 'signalPattern';

/** Per-signal destination settings, read from (or written to) telemetry-scoped unit config entries. */
export type DestinationSignalTargets = UnitDestinationSignalTargets;

interface DestinationViewModelBase {
  id: string;
  name: string;
  description?: string;
  signals: DestinationSignal[];
}

export interface ElasticsearchDestinationViewModel
  extends DestinationViewModelBase,
    DestinationSignalTargets {
  type: 'elasticsearch';
  mode: DestinationIndexMode;
}

/** Access keys are never read into the view model, only their presence is shown. */
export interface S3DestinationViewModel extends DestinationViewModelBase {
  type: 's3';
  bucket: string;
  region: string;
  prefix?: string;
}

export type DestinationViewModel = ElasticsearchDestinationViewModel | S3DestinationViewModel;

/** Fixed mode: one name composed onto every signal, or a name per signal. */
export type StaticIndexNaming = 'shared' | 'perSignal';

/** Per-type form state. Each destination type owns its own slice. */
export interface ElasticsearchDestinationFormData {
  /** When true, omit `index` so ES composes names from document metadata. */
  auto: boolean;
  /** Auto only: accept just `customSignals`, each limited to its write pattern. */
  useCustomWritePatterns: boolean;
  customSignals: DestinationSignal[];
  staticNaming: StaticIndexNaming;
  /** Static index, or auto write pattern, for logs. */
  logsIndex: string;
  metricsIndex: string;
  tracesIndex: string;
}

export interface S3DestinationFormData {
  region: string;
  bucket: string;
  prefix: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface DestinationCreationFormData {
  storageKind: DestinationStorageKind;
  destinationName: string;
  description: string;
  elasticsearch: ElasticsearchDestinationFormData;
  s3: S3DestinationFormData;
}

export type S3BucketValidationError = 'required' | 'invalid';

export interface DestinationCreationFormErrors {
  destinationName?: DestinationNameValidationError;
  staticIndexes?: 'required';
  customSignals?: 'required';
  logsIndex?: StaticIndexValidationError | AutoWritePatternValidationError;
  metricsIndex?: StaticIndexValidationError | AutoWritePatternValidationError;
  tracesIndex?: StaticIndexValidationError | AutoWritePatternValidationError;
  region?: 'required';
  bucket?: S3BucketValidationError;
  accessKeyId?: 'required';
  secretAccessKey?: 'required';
}

export type DestinationCreationFormField = keyof DestinationCreationFormErrors;

export type S3FieldsErrors = Pick<
  DestinationCreationFormErrors,
  'region' | 'bucket' | 'accessKeyId' | 'secretAccessKey'
>;

export const EMPTY_ELASTICSEARCH_DESTINATION_FORM: ElasticsearchDestinationFormData = {
  auto: true,
  useCustomWritePatterns: false,
  customSignals: [],
  staticNaming: 'shared',
  logsIndex: '',
  metricsIndex: '',
  tracesIndex: '',
};

export const EMPTY_S3_DESTINATION_FORM: S3DestinationFormData = {
  region: '',
  bucket: '',
  prefix: '',
  accessKeyId: '',
  secretAccessKey: '',
};

export const EMPTY_DESTINATION_CREATION_FORM: DestinationCreationFormData = {
  storageKind: 'local_elasticsearch',
  destinationName: '',
  description: '',
  elasticsearch: EMPTY_ELASTICSEARCH_DESTINATION_FORM,
  s3: EMPTY_S3_DESTINATION_FORM,
};
