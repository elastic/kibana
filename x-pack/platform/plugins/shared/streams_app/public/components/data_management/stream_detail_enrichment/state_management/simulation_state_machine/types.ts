/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Condition, FlattenRecord, SampleDocument } from '@kbn/streams-schema';
import { APIReturnType, StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { IToasts } from '@kbn/core/public';
import { BehaviorSubject } from 'rxjs';
import { Query, TimeState } from '@kbn/es-query';
import { DataPublicPluginStart, QueryState } from '@kbn/data-plugin/public';
import { ProcessorDefinitionWithUIAttributes } from '../../types';
import { PreviewDocsFilterOption } from './simulation_documents_search';
import { MappedSchemaField, SchemaField } from '../../../schema_editor/types';

export type Simulation = APIReturnType<'POST /internal/streams/{name}/processing/_simulate'>;
export type DetectedField = Simulation['detected_fields'][number];

export interface SimulationMachineDeps {
  timeState$: BehaviorSubject<TimeState>;
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
  search?: SimulationSearchParams;
  streamName: string;
}

export type SimulationEvent =
  | { type: 'dateRange.update' }
  | { type: 'processors.add'; processors: ProcessorDefinitionWithUIAttributes[] }
  | { type: 'processor.cancel'; processors: ProcessorDefinitionWithUIAttributes[] }
  | { type: 'processor.change'; processors: ProcessorDefinitionWithUIAttributes[] }
  | { type: 'processor.delete'; processors: ProcessorDefinitionWithUIAttributes[] }
  | { type: 'simulation.changePreviewDocsFilter'; filter: PreviewDocsFilterOption }
  | { type: 'simulation.changeSearchParams'; search: Partial<SimulationSearchParams> }
  | { type: 'simulation.fields.map'; field: MappedSchemaField }
  | { type: 'simulation.fields.unmap'; fieldName: string }
  | { type: 'simulation.reset' };

export interface SimulationContext {
  detectedSchemaFields: SchemaField[];
  previewDocsFilter: PreviewDocsFilterOption;
  previewDocuments: FlattenRecord[];
  processors: ProcessorDefinitionWithUIAttributes[];
  samples: SampleDocument[];
  samplingCondition?: Condition;
  search: SimulationSearchParams;
  simulation?: Simulation;
  streamName: string;
}
