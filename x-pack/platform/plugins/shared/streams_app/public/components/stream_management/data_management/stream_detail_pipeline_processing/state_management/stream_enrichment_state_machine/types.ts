/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { GrokCollection } from '@kbn/grok-ui';
import type { Pipeline } from '@kbn/ingest-pipelines-plugin/common/types';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import type { AnyActorRef } from 'xstate';
import type { Streams } from '@kbn/streams-schema';
import type {
  EnrichmentDataSource,
  EnrichmentUrlState,
} from '../../../../../../../common/url_schema';
import type { StreamsTelemetryClient } from '../../../../../../telemetry/client';
import type { MappedSchemaField } from '../../../schema_editor/types';
import type { ProcessingPersistenceAdapter } from '../../processing_persistence_adapter';
import type {
  PipelineConditionBlockWithUIAttributes,
  PipelineProcessorDefinition,
  PipelineProcessorsUiDefinition,
  PipelineStepBranch,
  PipelineStepWithUIAttributes,
} from '../../types';
import type { DataSourceActorRef, DataSourceToParentEvent } from '../data_source_state_machine';
import type { InteractiveModeActorRef } from '../interactive_mode_machine';
import type {
  PreviewDocsFilterOption,
  SimulationActorRef,
  SimulationContext,
} from '../simulation_state_machine';

export interface StreamPrivileges {
  manage: boolean;
  simulate: boolean;
}

export interface StreamEnrichmentServiceDependencies {
  refreshDefinition: () => void;
  streamsRepositoryClient: StreamsRepositoryClient;
  core: CoreStart;
  data: DataPublicPluginStart;
  urlStateStorageContainer: IKbnUrlStateStorage;
  telemetryClient: StreamsTelemetryClient;
}

export interface StreamEnrichmentInput {
  definition: Streams.ingest.all.GetResponse;
  pipeline: Pipeline;
  processingPersistenceAdapter: ProcessingPersistenceAdapter;
  grokCollection: GrokCollection;
}

export interface StreamEnrichmentContextType {
  // The Stream definition. This is handled outside of the machine, but any changes will be sent to the machine via events.
  definition: Streams.ingest.all.GetResponse;
  pipeline: Pipeline;
  processingPersistenceAdapter: ProcessingPersistenceAdapter;
  previousProcessors: IngestProcessorContainer[];
  // Refs for data source machines.
  dataSourcesRefs: DataSourceActorRef[];
  // Grok collection for Grok highlighting via the grok-ui package.
  grokCollection: GrokCollection;
  // Ref for the simulator state machine.
  simulatorRef: SimulationActorRef;
  // Overall URL state
  urlState: EnrichmentUrlState;
  // Ref for the interactive mode machine (only set when in interactive mode)
  interactiveModeRef: InteractiveModeActorRef | undefined;
  // Ref for the JSON mode machine (only set when in JSON mode)
  jsonModeRef: AnyActorRef | undefined;
  // Regardless of mode (interactive or JSON), this holds the current blob of pipeline definition reflecting the current changes.
  nextPipelineDefinition: PipelineProcessorsUiDefinition;
  // The last persisted pipeline definition blob, used to determine what has changed.
  previousPipelineDefinition: PipelineProcessorsUiDefinition;
  // Whether there are unsaved changes (diff of nextPipelineDefinition vs previousPipelineDefinition)
  hasChanges: boolean;
  // Schema validation errors (from Zod parsing)
  schemaErrors: string[];
  // Validation errors for processors (namespace, reserved fields, type mismatches)
  validationErrors: Map<string, Array<{ type: string; message: string }>>;
  fieldTypesByProcessor: Map<string, Map<string, string>>;
  /**
   * Tracks whether the current condition filter was applied automatically by the UI
   * (e.g. right after creating a condition block). If set, some user actions (save/cancel
   * processor edits) will clear the filter for convenience.
   */
  autoSelectedConditionId?: string;
}

export type StreamEnrichmentEvent =
  | DataSourceToParentEvent
  | { type: 'stream.received'; definition: Streams.ingest.all.GetResponse }
  | { type: 'stream.reset' }
  | { type: 'stream.update'; saveSchemaChanges?: boolean }
  | { type: 'simulation.refresh' }
  | { type: 'simulation.fetchMore' }
  | { type: 'simulation.viewDataPreview' }
  | { type: 'simulation.viewDetectedFields' }
  | { type: 'dataSources.add'; dataSource: EnrichmentDataSource }
  | { type: 'dataSources.select'; id: string }
  | { type: 'dataSources.closeManagement' }
  | { type: 'dataSources.openManagement' }
  | { type: 'simulation.changePreviewDocsFilter'; filter: PreviewDocsFilterOption }
  | { type: 'simulation.fields.map'; field: MappedSchemaField }
  | { type: 'simulation.fields.stageDocOnlyOverride'; fieldName: string; description?: string }
  | { type: 'simulation.fields.unmap'; fieldName: string }
  | { type: 'previewColumns.updateExplicitlyEnabledColumns'; columns: string[] }
  | { type: 'previewColumns.updateExplicitlyDisabledColumns'; columns: string[] }
  | { type: 'previewColumns.order'; columns: string[] }
  | { type: 'previewColumns.setSorting'; sorting: SimulationContext['previewColumnsSorting'] }
  | { type: 'url.initialized'; urlState: EnrichmentUrlState }
  | { type: 'url.sync' }
  | { type: 'mode.switchToJSON' }
  | { type: 'mode.switchToInteractive' }
  // Events from mode machines to parent
  | { type: 'mode.definitionUpdated'; definition: PipelineProcessorsUiDefinition }
  | { type: 'mode.schemaErrorsChanged'; errors: string[] }
  | { type: 'mode.resetSimulator' }
  | { type: 'simulation.reset' }
  | { type: 'simulation.updateSteps'; steps: PipelineStepWithUIAttributes[] }
  | { type: 'simulation.filterByConditionAuto'; conditionId: string }
  | { type: 'simulation.filterByCondition'; conditionId: string }
  | { type: 'simulation.clearConditionFilter' }
  | { type: 'simulation.clearAutoConditionFilter' }
  // Step events forwarded to interactive mode machine
  | {
      type: 'step.addProcessor';
      step?: PipelineProcessorDefinition;
      options?: {
        parentId: PipelineStepWithUIAttributes['parentId'];
        branch?: PipelineStepBranch;
      };
    }
  | {
      type: 'step.duplicateProcessor';
      processorStepId: string;
    }
  | {
      type: 'step.addCondition';
      step?: PipelineConditionBlockWithUIAttributes;
      options?: {
        parentId: PipelineStepWithUIAttributes['parentId'];
        branch?: PipelineStepBranch;
      };
    }
  | { type: 'step.reorder'; stepId: string; direction: 'up' | 'down' }
  | {
      type: 'step.reorderByDragDrop';
      sourceStepId: string;
      targetStepId: string;
      operation: 'before' | 'after' | 'inside' | 'inside-else';
    }
  // JSON events forwarded to JSON mode machine
  | {
      type: 'json.contentChanged';
      pipelineDefinition: PipelineProcessorsUiDefinition;
      json: string;
    }
  | { type: 'json.runSimulation'; stepIdBreakpoint?: string }
  | { type: 'url.initialized'; urlState: EnrichmentUrlState }
  | { type: 'url.sync' }
  // Suggestions events forwarded to interactive mode machine
  | { type: 'step.resetSteps'; steps: PipelineProcessorsUiDefinition['steps'] }
  | { type: 'suggestion.generate'; connectorId: string }
  | { type: 'suggestion.cancel' }
  | { type: 'suggestion.accept' }
  | { type: 'suggestion.dismiss' }
  | { type: 'suggestion.regenerate'; connectorId: string };
