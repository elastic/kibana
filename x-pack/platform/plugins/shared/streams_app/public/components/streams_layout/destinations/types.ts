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
 * Add a kind here, a fields component, and a registry entry to introduce another type.
 */
export type DestinationStorageKind =
  | 'local_elasticsearch'
  | 'remote_elasticsearch'
  | 'external_storage';

/** Working name until the backend settles it: https://github.com/elastic/ingest-dev/issues/10236 */
export const REMOTE_ELASTICSEARCH_TYPE = 'remote_elasticsearch' as const;

/** Unit destination types the UI can list and create. */
export type DestinationType = 'elasticsearch' | typeof REMOTE_ELASTICSEARCH_TYPE | 's3';

export type DestinationSignal = UnitDestinationSignal;
/** Signals whose indices are named `<signal>-<dataset>-<namespace>`. */
export type PrefixedDestinationSignal = Exclude<DestinationSignal, 'docs'>;
/** How an Elasticsearch destination chooses its indices. */
export type DestinationIndexMode = 'static' | 'auto';

export type StaticIndexValidationError =
  | 'template'
  | 'invalidName'
  | 'uppercase'
  | 'invalidCharacter'
  | 'signalPattern';

export type FreeFormIndexValidationError = Exclude<StaticIndexValidationError, 'signalPattern'>;

export type DocsWritePatternValidationError =
  | 'template'
  | 'tooLong'
  | 'uppercase'
  | 'invalidCharacter'
  | 'docsPrefix';

export type AutoWritePatternValidationError =
  | 'required'
  | 'tooLong'
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
  /** Fixed only. Never composed from the shared OTel name. */
  docsIndex: string;
  /** Auto custom only. */
  docsWritePatterns: string[];
}

/** Remote indices are full names: no signal prefix and no write patterns. */
export interface RemoteElasticsearchDestinationFormData
  extends Pick<
    ElasticsearchDestinationFormData,
    'auto' | 'staticNaming' | 'logsIndex' | 'metricsIndex' | 'tracesIndex' | 'docsIndex'
  > {
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
  description: string;
  elasticsearch: ElasticsearchDestinationFormData;
  remoteElasticsearch: RemoteElasticsearchDestinationFormData;
  s3: S3DestinationFormData;
}

export type S3BucketValidationError = 'required' | 'invalid';

export interface DocsWritePatternEntryError {
  pattern: string;
  error: DocsWritePatternValidationError;
}

export interface DestinationCreationFormErrors {
  destinationName?: DestinationNameValidationError;
  staticIndexes?: 'required';
  customSignals?: 'required';
  logsIndex?: StaticIndexValidationError | AutoWritePatternValidationError;
  metricsIndex?: StaticIndexValidationError | AutoWritePatternValidationError;
  tracesIndex?: StaticIndexValidationError | AutoWritePatternValidationError;
  docsIndex?: FreeFormIndexValidationError;
  /** Undefined when no entry fails, never an empty list. */
  docsWritePatterns?: 'required' | 'tooMany' | DocsWritePatternEntryError[];
  endpoint?: 'required' | 'invalid';
  apiKey?: 'required';
  region?: 'required';
  bucket?: S3BucketValidationError;
  accessKeyId?: 'required';
  secretAccessKey?: 'required';
}

export type DestinationCreationFormField = keyof DestinationCreationFormErrors;

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
  useCustomWritePatterns: false,
  customSignals: [],
  staticNaming: 'shared',
  logsIndex: '',
  metricsIndex: '',
  tracesIndex: '',
  docsIndex: '',
  docsWritePatterns: [],
};

export const EMPTY_REMOTE_ELASTICSEARCH_DESTINATION_FORM: RemoteElasticsearchDestinationFormData = {
  auto: true,
  staticNaming: 'shared',
  logsIndex: '',
  metricsIndex: '',
  tracesIndex: '',
  docsIndex: '',
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

export const EMPTY_DESTINATION_CREATION_FORM: DestinationCreationFormData = {
  storageKind: 'local_elasticsearch',
  destinationName: '',
  description: '',
  elasticsearch: EMPTY_ELASTICSEARCH_DESTINATION_FORM,
  remoteElasticsearch: EMPTY_REMOTE_ELASTICSEARCH_DESTINATION_FORM,
  s3: EMPTY_S3_DESTINATION_FORM,
};
