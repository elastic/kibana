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

export interface DestinationViewModel {
  id: string;
  name: string;
  type: DestinationType;
  signals: DestinationSignal[];
  mode: DestinationIndexMode;
  index?: string;
  /** User-defined write-role globs stored as unit `index_patterns`. */
  indexPatterns?: string[];
}

/** Per-type form state. Each destination type owns its own slice. */
export interface ElasticsearchDestinationFormData {
  /** When true, omit `index` so ES composes names from document metadata. */
  auto: boolean;
  /** Static index, or auto write-target glob, for logs. Empty in auto = no user pattern. */
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
  logsIndex?: StaticIndexValidationError | AutoWritePatternValidationError;
  metricsIndex?: StaticIndexValidationError | AutoWritePatternValidationError;
  tracesIndex?: StaticIndexValidationError | AutoWritePatternValidationError;
}

export const EMPTY_ELASTICSEARCH_DESTINATION_FORM: ElasticsearchDestinationFormData = {
  auto: true,
  logsIndex: '',
  metricsIndex: '',
  tracesIndex: '',
};
