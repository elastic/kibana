/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsV2 } from '@kbn/streams-schema';
import type { DestinationNameValidationError } from './destination_helpers';
import type { REMOTE_ELASTICSEARCH_TYPE } from './remote_elasticsearch_constants';

/**
 * Destination storage choices shown in the create form.
 * Add a kind here, a fields component, and a registry entry to introduce another type.
 */
export type DestinationStorageKind =
  | 'local_elasticsearch'
  | 'remote_elasticsearch'
  | 'external_storage';

/** Unit destination types the UI can list and create. */
export type DestinationType = 'elasticsearch' | typeof REMOTE_ELASTICSEARCH_TYPE | 's3';

export type DestinationSignal = StreamsV2.OtlpSignal;

/** Default write-role globs for auto destinations, one per ingest signal. */
export const AUTO_INDEX_PATTERNS: readonly string[] = ['logs-*-*', 'metrics-*-*', 'traces-*-*'];

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

interface DestinationViewModelBase {
  id: string;
  name: string;
  signals: DestinationSignal[];
}

export interface ElasticsearchDestinationViewModel extends DestinationViewModelBase {
  type: 'elasticsearch';
  mode: DestinationIndexMode;
  index?: string;
  /** User-defined write-role globs stored as unit `index_patterns`. */
  indexPatterns?: string[];
}

/** Access keys are never read into the view model, only their presence is shown. */
export interface S3DestinationViewModel extends DestinationViewModelBase {
  type: 's3';
  bucket: string;
  region: string;
  prefix?: string;
}

/** The API key is never read into the view model. */
export interface RemoteElasticsearchDestinationViewModel extends DestinationViewModelBase {
  type: typeof REMOTE_ELASTICSEARCH_TYPE;
  endpoint: string;
  mode: DestinationIndexMode;
  /** Unscoped index, or the per-signal ones. Empty in auto. */
  indexBySignal: Partial<Record<DestinationSignal, string>>;
}

export type DestinationViewModel =
  | ElasticsearchDestinationViewModel
  | RemoteElasticsearchDestinationViewModel
  | S3DestinationViewModel;

/** Per-type form state. Each destination type owns its own slice. */
export interface ElasticsearchDestinationFormData {
  /** When true, omit `index` so ES composes names from document metadata. */
  auto: boolean;
  /** Static index, or auto write-target glob, for logs. Empty in auto = no user pattern. */
  logsIndex: string;
  metricsIndex: string;
  tracesIndex: string;
}

export interface RemoteElasticsearchDestinationFormData extends ElasticsearchDestinationFormData {
  endpoint: string;
  apiKey: string;
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
  elasticsearch: ElasticsearchDestinationFormData;
  remoteElasticsearch: RemoteElasticsearchDestinationFormData;
  s3: S3DestinationFormData;
}

export type S3BucketValidationError = 'required' | 'invalid';

export interface DestinationCreationFormErrors {
  destinationName?: DestinationNameValidationError;
  staticIndexes?: 'required';
  logsIndex?: StaticIndexValidationError | AutoWritePatternValidationError;
  metricsIndex?: StaticIndexValidationError | AutoWritePatternValidationError;
  tracesIndex?: StaticIndexValidationError | AutoWritePatternValidationError;
  endpoint?: 'required' | 'invalid';
  apiKey?: 'required';
  region?: 'required';
  bucket?: S3BucketValidationError;
  accessKeyId?: 'required';
  secretAccessKey?: 'required';
}

export type RemoteElasticsearchConnectionErrors = Pick<
  DestinationCreationFormErrors,
  'endpoint' | 'apiKey'
>;

export type S3FieldsErrors = Pick<
  DestinationCreationFormErrors,
  'region' | 'bucket' | 'accessKeyId' | 'secretAccessKey'
>;

export const EMPTY_ELASTICSEARCH_DESTINATION_FORM: ElasticsearchDestinationFormData = {
  auto: true,
  logsIndex: '',
  metricsIndex: '',
  tracesIndex: '',
};

export const EMPTY_REMOTE_ELASTICSEARCH_DESTINATION_FORM: RemoteElasticsearchDestinationFormData = {
  auto: true,
  logsIndex: '',
  metricsIndex: '',
  tracesIndex: '',
  endpoint: '',
  apiKey: '',
};

export const EMPTY_S3_DESTINATION_FORM: S3DestinationFormData = {
  region: '',
  bucket: '',
  prefix: '',
  accessKeyId: '',
  secretAccessKey: '',
};
