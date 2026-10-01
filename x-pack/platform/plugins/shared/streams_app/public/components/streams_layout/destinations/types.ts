/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DestinationNameValidationError } from './destination_helpers';

/**
 * Destination storage choices shown in the create form.
 * Only `local_elasticsearch` is persisted today. Add a kind here, a fields
 * component, and a registry entry to introduce another type.
 */
export type DestinationStorageKind = 'local_elasticsearch' | 'external_storage';

/** Unit destination types the UI can list and create. */
export type DestinationType = 'elasticsearch';

export interface DestinationViewModel {
  id: string;
  name: string;
  type: DestinationType;
  /** Elasticsearch `config` entry `index`. */
  index: string;
  /**
   * Elasticsearch `config` entry `index_patterns`.
   * Static indexes that omit the entry surface the spec default of `[index]`.
   */
  indexPatterns: string[];
}

/** Per-type form state. Each destination type owns its own slice. */
export interface ElasticsearchDestinationFormData {
  index: string;
  /** Raw index patterns, one per line or comma-separated. */
  indexPatterns: string;
}

export interface DestinationCreationFormData {
  storageKind: DestinationStorageKind;
  destinationName: string;
  elasticsearch: ElasticsearchDestinationFormData;
}

export interface DestinationCreationFormErrors {
  destinationName?: DestinationNameValidationError;
  index?: 'required';
  indexPatterns?: 'required' | 'invalid';
}

export const EMPTY_ELASTICSEARCH_DESTINATION_FORM: ElasticsearchDestinationFormData = {
  index: '',
  indexPatterns: '',
};
