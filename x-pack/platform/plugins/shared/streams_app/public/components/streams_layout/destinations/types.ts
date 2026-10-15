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

export type DestinationSignal = 'logs' | 'metrics' | 'traces';

/** How an Elasticsearch destination chooses its indices. */
export type DestinationIndexMode = 'static' | 'auto';

export type StaticIndexValidationError =
  | 'template'
  | 'invalidName'
  | 'uppercase'
  | 'invalidCharacter'
  | 'signalPattern';

export interface DestinationViewModel {
  id: string;
  name: string;
  type: DestinationType;
  signal: DestinationSignal;
  mode: DestinationIndexMode;
  index?: string;
}

/** Per-type form state. Each destination type owns its own slice. */
export interface ElasticsearchDestinationFormData {
  /** When true, omit per-signal indexes so ES composes names from document metadata. */
  auto: boolean;
  logsIndex: string;
  metricsIndex: string;
  tracesIndex: string;
}

export interface DestinationCreationFormData {
  storageKind: DestinationStorageKind;
  destinationName: string;
  elasticsearch: ElasticsearchDestinationFormData;
}

export interface DestinationCreationFormErrors {
  destinationName?: DestinationNameValidationError;
  staticIndexes?: 'required';
  logsIndex?: StaticIndexValidationError;
  metricsIndex?: StaticIndexValidationError;
  tracesIndex?: StaticIndexValidationError;
}

export const EMPTY_ELASTICSEARCH_DESTINATION_FORM: ElasticsearchDestinationFormData = {
  auto: true,
  logsIndex: '',
  metricsIndex: '',
  tracesIndex: '',
};
