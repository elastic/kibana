/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldDefinitionConfig, InheritedFieldDefinitionConfig } from '../fields';
import type { FlattenRecord } from '../shared/record_types';

export interface BaseSimulationError {
  message: string;
}

export type SimulationError = BaseSimulationError &
  (
    | {
        type: 'field_mapping_failure';
      }
    | {
        type: 'generic_processor_failure';
        processor_id: string;
      }
    | {
        type: 'generic_simulation_failure';
        processor_id?: string;
      }
    | {
        type: 'ignored_fields_failure';
        ignored_fields: Array<Record<string, string>>;
      }
    | {
        type: 'non_namespaced_fields_failure';
        processor_id: string;
      }
    | {
        type: 'reserved_field_failure';
        processor_id: string;
      }
    | {
        type: 'validation_error';
      }
  );

export type DocSimulationStatus = 'parsed' | 'partially_parsed' | 'skipped' | 'failed' | 'dropped';

export interface SimulationDocReport {
  detected_fields: Array<{ processor_id: string; name: string }>;
  errors: SimulationError[];
  status: DocSimulationStatus;
  processed_by: string[];
  value: FlattenRecord;
}

export interface ProcessorMetrics {
  detected_fields: string[];
  errors: SimulationError[];
  failed_rate: number;
  skipped_rate: number;
  parsed_rate: number;
  dropped_rate: number;
}

export type DetectedField =
  | WithNameAndEsType
  | WithNameAndEsType<FieldDefinitionConfig | InheritedFieldDefinitionConfig>;

export type WithNameAndEsType<TObj = {}> = TObj & {
  name: string;
  esType?: string;
  suggestedType?: string;
};

export interface DocumentsMetrics {
  failed_rate: number;
  partially_parsed_rate: number;
  skipped_rate: number;
  parsed_rate: number;
  dropped_rate: number;
}

export interface ProcessingSimulationResponse {
  detected_fields: DetectedField[];
  documents: SimulationDocReport[];
  processors_metrics: Record<string, ProcessorMetrics>;
  definition_error: SimulationError | undefined;
  documents_metrics: DocumentsMetrics;
}
