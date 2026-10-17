/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DestinationNameValidationError } from './destination_helpers';

/**
 * Destination storage choices shown in the create form.
 * Add a kind here, a fields component, and a registry entry to introduce another type.
 */
export type DestinationStorageKind = 'local_elasticsearch' | 'external_storage';

/** Unit destination types the UI can list and create. */
export type DestinationType = 'elasticsearch' | 's3';

interface DestinationViewModelBase {
  id: string;
  name: string;
}

export interface ElasticsearchDestinationViewModel extends DestinationViewModelBase {
  type: 'elasticsearch';
  /** Elasticsearch `config` entry `index`. */
  index: string;
  /**
   * Elasticsearch `config` entry `index_patterns`.
   * Static indexes that omit the entry surface the spec default of `[index]`.
   */
  indexPatterns: string[];
}

/** Never carries credentials, so they can't reach the table or canvas. */
export interface S3DestinationViewModel extends DestinationViewModelBase {
  type: 's3';
  bucket: string;
  region: string;
}

export type DestinationViewModel = ElasticsearchDestinationViewModel | S3DestinationViewModel;

/** Per-type form state. Each destination type owns its own slice. */
export interface ElasticsearchDestinationFormData {
  index: string;
  /** Raw index patterns, one per line or comma-separated. */
  indexPatterns: string;
}

export interface S3DestinationFormData {
  region: string;
  bucket: string;
  accessKey: string;
  secret: string;
}

export interface DestinationCreationFormData {
  storageKind: DestinationStorageKind;
  destinationName: string;
  elasticsearch: ElasticsearchDestinationFormData;
  s3: S3DestinationFormData;
}

export type S3DestinationFormErrors = Partial<Record<keyof S3DestinationFormData, 'required'>>;

export interface DestinationCreationFormErrors extends S3DestinationFormErrors {
  destinationName?: DestinationNameValidationError;
  index?: 'required';
  indexPatterns?: 'required' | 'invalid';
}

export const EMPTY_ELASTICSEARCH_DESTINATION_FORM: ElasticsearchDestinationFormData = {
  index: '',
  indexPatterns: '',
};

export const EMPTY_S3_DESTINATION_FORM: S3DestinationFormData = {
  region: '',
  bucket: '',
  accessKey: '',
  secret: '',
};
