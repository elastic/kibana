/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IngestSimulateDocumentResult,
  SimulateIngestResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { FieldDefinitionConfig, InheritedFieldDefinitionConfig } from '../../fields';
import type { FlattenRecord } from '../../shared/record_types';

type WithNameAndEsType<TObj = {}> = TObj & {
  name: string;
  esType?: string;
  suggestedType?: string;
};

type WithRequired<TObj, TKey extends keyof TObj> = TObj & { [TProp in TKey]-?: TObj[TProp] };

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
  );

export type DocSimulationStatus = 'parsed' | 'partially_parsed' | 'skipped' | 'failed';

export interface SimulationDocReport {
  detected_fields: Array<{ processor_id: string; name: string }>;
  errors: SimulationError[];
  status: DocSimulationStatus;
  value: FlattenRecord;
}

export interface ProcessorMetrics {
  detected_fields: string[];
  errors: SimulationError[];
  failed_rate: number;
  skipped_rate: number;
  parsed_rate: number;
}

// Narrow down the type to only successful processor results
export type SuccessfulPipelineSimulateDocumentResult = WithRequired<
  IngestSimulateDocumentResult,
  'processor_results'
>;

export interface SuccessfulPipelineSimulateResponse {
  docs: SuccessfulPipelineSimulateDocumentResult[];
}

export type PipelineSimulationResult =
  | {
      status: 'success';
      simulation: SuccessfulPipelineSimulateResponse;
    }
  | {
      status: 'failure';
      error: SimulationError;
    };

export type IngestSimulationResult =
  | {
      status: 'success';
      simulation: SimulateIngestResponse;
    }
  | {
      status: 'failure';
      error: SimulationError;
    };

export type DetectedField =
  | WithNameAndEsType
  | WithNameAndEsType<FieldDefinitionConfig | InheritedFieldDefinitionConfig>;

export interface SimulationResponseBase {
  detected_fields: DetectedField[];
  documents: SimulationDocReport[];
  processors_metrics: Record<string, ProcessorMetrics>;
  documents_metrics: {
    failed_rate: number;
    partially_parsed_rate: number;
    skipped_rate: number;
    parsed_rate: number;
  };
  definition_error?: SimulationError;
}

export type SuccessfulSimulationResponse = SimulationResponseBase;

export type FailedSimulationResponse = SimulationResponseBase;

export type SimulationResponse = SuccessfulSimulationResponse | FailedSimulationResponse;
