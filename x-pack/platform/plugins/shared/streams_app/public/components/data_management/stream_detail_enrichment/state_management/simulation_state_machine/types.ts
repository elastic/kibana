/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlattenRecord, SampleDocument } from '@kbn/streams-schema';
import type { APIReturnType, StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import type { IToasts } from '@kbn/core/public';
import type { Query } from '@kbn/es-query';
import type { DataPublicPluginStart, QueryState } from '@kbn/data-plugin/public';
import type { StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import type { PreviewDocsFilterOption } from './simulation_documents_search';
import type { MappedSchemaField, SchemaField } from '../../../schema_editor/types';

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
  | { type: 'previewColumns.updateExplicitlyEnabledColumns'; columns: string[] }
  | { type: 'previewColumns.updateExplicitlyDisabledColumns'; columns: string[] }
  | { type: 'previewColumns.order'; columns: string[] }
  | { type: 'step.add'; steps: StreamlangStepWithUIAttributes[] }
  | { type: 'step.cancel'; steps: StreamlangStepWithUIAttributes[] }
  | { type: 'step.change'; steps: StreamlangStepWithUIAttributes[] }
  | { type: 'step.delete'; steps: StreamlangStepWithUIAttributes[] }
  | { type: 'step.edit'; steps: StreamlangStepWithUIAttributes[] }
  | { type: 'step.save'; steps: StreamlangStepWithUIAttributes[] }
  | { type: 'simulation.changePreviewDocsFilter'; filter: PreviewDocsFilterOption }
  | { type: 'simulation.fields.map'; field: MappedSchemaField }
  | { type: 'simulation.fields.unmap'; fieldName: string }
  | { type: 'simulation.reset' }
  | { type: 'previewColumns.setSorting'; sorting: SimulationContext['previewColumnsSorting'] }
  | { type: 'previewColumns.order'; columns: string[] }
  | { type: 'simulation.receive_samples'; samples: SampleDocumentWithUIAttributes[] };

export interface SimulationContext {
  detectedSchemaFields: SchemaField[];
  detectedSchemaFieldsCache: Map<string, SchemaField>;
  previewDocsFilter: PreviewDocsFilterOption;
  previewDocuments: FlattenRecord[];
  explicitlyEnabledPreviewColumns: string[];
  explicitlyDisabledPreviewColumns: string[];
  previewColumnsOrder: string[];
  previewColumnsSorting: {
    fieldName?: string;
    direction: 'asc' | 'desc';
  };
  steps: StreamlangStepWithUIAttributes[];
  samples: SampleDocumentWithUIAttributes[];
  simulation?: Simulation;
  streamName: string;
  streamType: 'wired' | 'classic' | 'unknown';
}
