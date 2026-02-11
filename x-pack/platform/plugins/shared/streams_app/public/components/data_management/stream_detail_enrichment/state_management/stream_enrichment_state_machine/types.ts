/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { GrokCollection } from '@kbn/grok-ui';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type {
  FieldType,
  StreamlangConditionBlock,
  StreamlangDSL,
  StreamlangProcessorDefinition,
  StreamlangStepWithUIAttributes,
  StreamlangValidationError,
} from '@kbn/streamlang';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import type { Streams } from '@kbn/streams-schema';
import type { EnrichmentDataSource, EnrichmentUrlState } from '../../../../../../common/url_schema';
import type { StreamsTelemetryClient } from '../../../../../telemetry/client';
import type { MappedSchemaField } from '../../../schema_editor/types';
import type { DataSourceActorRef, DataSourceToParentEvent } from '../data_source_state_machine';
import type { InteractiveModeActorRef } from '../interactive_mode_machine';
import type {
  PreviewDocsFilterOption,
  SimulationActorRef,
  SimulationContext,
} from '../simulation_state_machine';
import type { YamlModeActorRef } from '../yaml_mode_machine';

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
  grokCollection: GrokCollection;
}

export interface StreamEnrichmentContextType {
  // The Stream definition. This is handled outside of the machine, but any changes will be sent to the machine via events.
  definition: Streams.ingest.all.GetResponse;
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
  // Ref for the YAML mode machine (only set when in YAML mode)
  yamlModeRef: YamlModeActorRef | undefined;
  // Regardless of mode (interactive or YAML), this holds the current blob of Streamlang DSL reflecting the current changes.
  nextStreamlangDSL: StreamlangDSL;
  // The last persisted Streamlang DSL blob, used to determine what has changed.
  previousStreamlangDSL: StreamlangDSL;
  // Whether there are unsaved changes (diff of nextStreamlangDSL vs previousStreamlangDSL)
  hasChanges: boolean;
  // Schema validation errors (from Zod parsing)
  schemaErrors: string[];
  // Validation errors for processors (namespace, reserved fields, type mismatches)
  validationErrors: Map<string, StreamlangValidationError[]>;
  fieldTypesByProcessor: Map<string, Map<string, FieldType>>;
}

export type StreamEnrichmentEvent =
  | DataSourceToParentEvent
  | { type: 'stream.received'; definition: Streams.ingest.all.GetResponse }
  | { type: 'stream.reset' }
  | { type: 'stream.update' }
  | { type: 'simulation.refresh' }
  | { type: 'simulation.viewDataPreview' }
  | { type: 'simulation.viewDetectedFields' }
  | { type: 'dataSources.add'; dataSource: EnrichmentDataSource }
  | { type: 'dataSources.select'; id: string }
  | { type: 'dataSources.closeManagement' }
  | { type: 'dataSources.openManagement' }
  | { type: 'simulation.changePreviewDocsFilter'; filter: PreviewDocsFilterOption }
  | { type: 'simulation.fields.map'; field: MappedSchemaField }
  | { type: 'simulation.fields.unmap'; fieldName: string }
  | { type: 'previewColumns.updateExplicitlyEnabledColumns'; columns: string[] }
  | { type: 'previewColumns.updateExplicitlyDisabledColumns'; columns: string[] }
  | { type: 'previewColumns.order'; columns: string[] }
  | { type: 'previewColumns.setSorting'; sorting: SimulationContext['previewColumnsSorting'] }
  | { type: 'url.initialized'; urlState: EnrichmentUrlState }
  | { type: 'url.sync' }
  | { type: 'mode.switchToYAML' }
  | { type: 'mode.switchToInteractive' }
  // Events from mode machines to parent
  | { type: 'mode.dslUpdated'; dsl: StreamlangDSL }
  | { type: 'mode.resetSimulator' }
  | { type: 'simulation.reset' }
  | { type: 'simulation.updateSteps'; steps: StreamlangStepWithUIAttributes[] }
  | { type: 'simulation.filterByCondition'; conditionId: string }
  | { type: 'simulation.clearConditionFilter' }
  // Step events forwarded to interactive mode machine
  | {
      type: 'step.addProcessor';
      step?: StreamlangProcessorDefinition;
      options?: { parentId: StreamlangStepWithUIAttributes['parentId'] };
    }
  | {
      type: 'step.duplicateProcessor';
      processorStepId: string;
    }
  | {
      type: 'step.addCondition';
      step?: StreamlangConditionBlock;
      options?: { parentId: StreamlangStepWithUIAttributes['parentId'] };
    }
  | { type: 'step.reorder'; stepId: string; direction: 'up' | 'down' }
  | {
      type: 'step.reorderByDragDrop';
      sourceStepId: string;
      targetStepId: string;
      operation: 'before' | 'after' | 'inside';
    }
  // YAML events forwarded to YAML mode machine
  | { type: 'yaml.contentChanged'; streamlangDSL: StreamlangDSL; yaml: string }
  | { type: 'yaml.runSimulation'; stepIdBreakpoint?: string }
  | { type: 'url.initialized'; urlState: EnrichmentUrlState }
  | { type: 'url.sync' }
  // Suggestions events forwarded to interactive mode machine
  | { type: 'step.resetSteps'; steps: StreamlangDSL['steps'] }
  | { type: 'suggestion.generate'; connectorId: string }
  | { type: 'suggestion.cancel' }
  | { type: 'suggestion.accept' }
  | { type: 'suggestion.dismiss' }
  | { type: 'suggestion.regenerate'; connectorId: string };
