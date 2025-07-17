/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { ProcessorDefinition, Streams } from '@kbn/streams-schema';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { GrokCollection } from '@kbn/grok-ui';
import { EnrichmentDataSource, EnrichmentUrlState } from '../../../../../../common/url_schema';
import { ProcessorActorRef, ProcessorToParentEvent } from '../processor_state_machine';
import {
  PreviewDocsFilterOption,
  SimulationActorRef,
  SimulationContext,
} from '../simulation_state_machine';
import { MappedSchemaField } from '../../../schema_editor/types';
import { DataSourceActorRef, DataSourceToParentEvent } from '../data_source_state_machine';

export interface StreamEnrichmentServiceDependencies {
  refreshDefinition: () => void;
  streamsRepositoryClient: StreamsRepositoryClient;
  core: CoreStart;
  data: DataPublicPluginStart;
  urlStateStorageContainer: IKbnUrlStateStorage;
}

export interface StreamEnrichmentInput {
  definition: Streams.ingest.all.GetResponse;
}

export interface StreamEnrichmentContextType {
  definition: Streams.ingest.all.GetResponse;
  initialProcessorsRefs: ProcessorActorRef[];
  dataSourcesRefs: DataSourceActorRef[];
  processorsRefs: ProcessorActorRef[];
  grokCollection: GrokCollection;
  simulatorRef?: SimulationActorRef;
  urlState: EnrichmentUrlState;
}

export type StreamEnrichmentEvent =
  | DataSourceToParentEvent
  | ProcessorToParentEvent
  | { type: 'stream.received'; definition: Streams.ingest.all.GetResponse }
  | { type: 'stream.reset' }
  | { type: 'stream.update' }
  | { type: 'simulation.refresh' }
  | { type: 'simulation.viewDataPreview' }
  | { type: 'simulation.viewDetectedFields' }
  | { type: 'dataSources.add'; dataSource: EnrichmentDataSource }
  | { type: 'dataSources.closeManagement' }
  | { type: 'dataSources.openManagement' }
  | { type: 'simulation.changePreviewDocsFilter'; filter: PreviewDocsFilterOption }
  | { type: 'simulation.fields.map'; field: MappedSchemaField }
  | { type: 'simulation.fields.unmap'; fieldName: string }
  | { type: 'previewColumns.updateExplicitlyEnabledColumns'; columns: string[] }
  | { type: 'previewColumns.updateExplicitlyDisabledColumns'; columns: string[] }
  | { type: 'previewColumns.order'; columns: string[] }
  | { type: 'previewColumns.setSorting'; sorting: SimulationContext['previewColumnsSorting'] }
  | { type: 'processors.add'; processor?: ProcessorDefinition }
  | { type: 'processors.reorder'; from: number; to: number }
  | { type: 'url.initialized'; urlState: EnrichmentUrlState }
  | { type: 'url.sync' };
