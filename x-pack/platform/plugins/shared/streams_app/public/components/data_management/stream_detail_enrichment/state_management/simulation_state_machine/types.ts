/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FlattenRecord, SampleDocument } from '@kbn/streams-schema';
import { APIReturnType, StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { IToasts } from '@kbn/core/public';
import { Query } from '@kbn/es-query';
import { DataPublicPluginStart, QueryState } from '@kbn/data-plugin/public';
import { ProcessorDefinitionWithUIAttributes } from '../../types';
import { PreviewDocsFilterOption } from './simulation_documents_search';
import { MappedSchemaField, SchemaField } from '../../../schema_editor/types';

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
  processors: ProcessorDefinitionWithUIAttributes[];
  streamName: string;
}

export interface SampleDocumentWithUIAttributes {
  dataSourceIndex: number;
  document: SampleDocument;
}

export type SimulationEvent =
  | { type: 'previewColumns.updateExplicitlyEnabledColumns'; columns: string[] }
  | { type: 'previewColumns.updateExplicitlyDisabledColumns'; columns: string[] }
  | { type: 'previewColumns.order'; columns: string[] }
  | { type: 'processors.add'; processors: ProcessorDefinitionWithUIAttributes[] }
  | { type: 'processor.cancel'; processors: ProcessorDefinitionWithUIAttributes[] }
  | { type: 'processor.change'; processors: ProcessorDefinitionWithUIAttributes[] }
  | { type: 'processor.delete'; processors: ProcessorDefinitionWithUIAttributes[] }
  | { type: 'simulation.changePreviewDocsFilter'; filter: PreviewDocsFilterOption }
  | { type: 'simulation.fields.map'; field: MappedSchemaField }
  | { type: 'simulation.fields.unmap'; fieldName: string }
  | { type: 'simulation.reset' }
  | { type: 'previewColumns.updateExplicitlyEnabledColumns'; columns: string[] }
  | { type: 'previewColumns.updateExplicitlyDisabledColumns'; columns: string[] }
  | { type: 'previewColumns.setSorting'; sorting: SimulationContext['previewColumnsSorting'] }
  | { type: 'previewColumns.order'; columns: string[] }
  | { type: 'simulation.receive_samples'; samples: SampleDocumentWithUIAttributes[] };

export interface SimulationContext {
  detectedSchemaFields: SchemaField[];
  previewDocsFilter: PreviewDocsFilterOption;
  previewDocuments: FlattenRecord[];
  explicitlyEnabledPreviewColumns: string[];
  explicitlyDisabledPreviewColumns: string[];
  previewColumnsOrder: string[];
  previewColumnsSorting: {
    fieldName?: string;
    direction: 'asc' | 'desc';
  };
  processors: ProcessorDefinitionWithUIAttributes[];
  samples: SampleDocumentWithUIAttributes[];
  simulation?: Simulation;
  streamName: string;
}
