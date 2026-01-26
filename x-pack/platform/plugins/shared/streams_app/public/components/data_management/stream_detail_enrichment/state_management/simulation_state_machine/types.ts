/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IToasts } from '@kbn/core/public';
import type { DataPublicPluginStart, QueryState } from '@kbn/data-plugin/public';
import type { Query } from '@kbn/es-query';
import type { StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import type { APIReturnType, StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import type { SampleDocument } from '@kbn/streams-schema';
import type { MappedSchemaField, SchemaField } from '../../../schema_editor/types';
import type { PreviewDocsFilterOption } from './simulation_documents_search';

export type Simulation = APIReturnType<'POST /internal/streams/{name}/processing/_simulate'>;
export type DetectedField = Simulation['detected_fields'][number];

export interface SimulationMachineDeps {
  data: DataPublicPluginStart;
  streamsRepositoryClient: StreamsRepositoryClient;
  toasts: IToasts;
}

export type ProcessorMetrics =
  Simulation['processors_metrics'][keyof Simulation['processors_metrics']];

export interface SimulationSearchParams extends Required<QueryState> {
  query: Query;
}

export interface SimulationInput {
  steps: StreamlangStepWithUIAttributes[];
  streamName: string;
  streamType: 'wired' | 'classic' | 'unknown';
}

export interface SampleDocumentWithUIAttributes {
  dataSourceId: string;
  document: SampleDocument;
}

export type SimulationEvent =
  | { type: 'previewColumns.order'; columns: string[] }
  | { type: 'previewColumns.setSorting'; sorting: SimulationContext['previewColumnsSorting'] }
  | { type: 'previewColumns.updateExplicitlyDisabledColumns'; columns: string[] }
  | { type: 'previewColumns.updateExplicitlyEnabledColumns'; columns: string[] }
  | { type: 'simulation.filterByCondition'; conditionId: string }
  | { type: 'simulation.clearConditionFilter' }
  | { type: 'simulation.changePreviewDocsFilter'; filter: PreviewDocsFilterOption }
  | { type: 'simulation.fields.map'; field: MappedSchemaField }
  | { type: 'simulation.fields.unmap'; fieldName: string }
  | { type: 'simulation.receive_samples'; samples: SampleDocumentWithUIAttributes[] }
  | { type: 'simulation.receive_steps'; steps: StreamlangStepWithUIAttributes[] }
  | { type: 'simulation.updateSteps'; steps: StreamlangStepWithUIAttributes[] }
  | { type: 'simulation.reset' }
  | { type: 'step.change'; steps: StreamlangStepWithUIAttributes[] }
  | { type: 'step.delete'; steps: StreamlangStepWithUIAttributes[] };

export interface SimulationContext {
  detectedSchemaFields: SchemaField[];
  detectedSchemaFieldsCache: Map<string, SchemaField>;
  previewDocsFilter: PreviewDocsFilterOption;
  explicitlyEnabledPreviewColumns: string[];
  explicitlyDisabledPreviewColumns: string[];
  previewColumnsOrder: string[];
  previewColumnsSorting: {
    fieldName?: string;
    direction: 'asc' | 'desc';
  };
  steps: StreamlangStepWithUIAttributes[];
  samples: SampleDocumentWithUIAttributes[];
  selectedConditionId?: string;
  simulation?: Simulation;
  baseSimulation?: Simulation;
  streamName: string;
  streamType: 'wired' | 'classic' | 'unknown';
}
