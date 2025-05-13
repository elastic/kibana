/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { IngestStreamGetResponse } from '@kbn/streams-schema';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { ProcessorDefinitionWithUIAttributes } from '../../types';
import { ProcessorActorRef, ProcessorToParentEvent } from '../processor_state_machine';
import { PreviewDocsFilterOption, SimulationActorRef } from '../simulation_state_machine';
import { MappedSchemaField } from '../../../schema_editor/types';

export interface StreamEnrichmentServiceDependencies {
  refreshDefinition: () => void;
  streamsRepositoryClient: StreamsRepositoryClient;
  core: CoreStart;
  data: DataPublicPluginStart;
}

export interface StreamEnrichmentInput {
  definition: IngestStreamGetResponse;
}

export interface StreamEnrichmentContextType {
  definition: IngestStreamGetResponse;
  initialProcessorsRefs: ProcessorActorRef[];
  processorsRefs: ProcessorActorRef[];
  simulatorRef?: SimulationActorRef;
}

export type StreamEnrichmentEvent =
  | ProcessorToParentEvent
  | { type: 'stream.received'; definition: IngestStreamGetResponse }
  | { type: 'stream.reset' }
  | { type: 'stream.update' }
  | { type: 'simulation.viewDataPreview' }
  | { type: 'simulation.viewDetectedFields' }
  | { type: 'simulation.changePreviewDocsFilter'; filter: PreviewDocsFilterOption }
  | { type: 'simulation.fields.map'; field: MappedSchemaField }
  | { type: 'simulation.fields.unmap'; fieldName: string }
  | { type: 'processors.add'; processor: ProcessorDefinitionWithUIAttributes }
  | { type: 'processors.reorder'; processorsRefs: ProcessorActorRef[] };
