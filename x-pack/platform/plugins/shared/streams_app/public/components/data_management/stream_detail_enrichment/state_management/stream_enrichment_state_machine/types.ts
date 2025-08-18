/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import type { Streams } from '@kbn/streams-schema';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { GrokCollection } from '@kbn/grok-ui';
import type { StreamlangProcessorDefinition } from '@kbn/streamlang';
import type { EnrichmentDataSource, EnrichmentUrlState } from '../../../../../../common/url_schema';
import type { ProcessorActorRef, ProcessorToParentEvent } from '../processor_state_machine';
import type {
  PreviewDocsFilterOption,
  SimulationActorRef,
  SimulationContext,
} from '../simulation_state_machine';
import type { MappedSchemaField } from '../../../schema_editor/types';
import type { DataSourceActorRef, DataSourceToParentEvent } from '../data_source_state_machine';

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
  simulatorRef: SimulationActorRef;
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
  | { type: 'processors.add'; processor?: StreamlangProcessorDefinition }
  | { type: 'processors.reorder'; from: number; to: number }
  | { type: 'url.initialized'; urlState: EnrichmentUrlState }
  | { type: 'url.sync' };
