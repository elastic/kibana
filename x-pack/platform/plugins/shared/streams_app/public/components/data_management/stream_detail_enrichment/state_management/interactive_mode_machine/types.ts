/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IToasts, NotificationsStart } from '@kbn/core/public';
import type { GrokCollection } from '@kbn/grok-ui';
import type {
  StreamlangProcessorDefinition,
  StreamlangStepWithUIAttributes,
} from '@kbn/streamlang';
import type { StreamlangConditionBlock, StreamlangDSL } from '@kbn/streamlang/types/streamlang';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import type { StreamsTelemetryClient } from '../../../../../telemetry/client';
import type { DataSourceActorRef, DataSourceSimulationMode } from '../data_source_state_machine';
import type { SimulationActorRef } from '../simulation_state_machine';
import type { StepActorRef } from '../steps_state_machine';
import type { StreamPrivileges } from '../stream_enrichment_state_machine/types';

export interface InteractiveModeMachineDeps {
  streamsRepositoryClient: StreamsRepositoryClient;
  notifications: NotificationsStart;
  toasts: IToasts;
  telemetryClient: StreamsTelemetryClient;
}

export type InteractiveModeToParentEvent =
  | { type: 'mode.dslUpdated'; dsl: StreamlangDSL }
  | { type: 'simulation.reset' }
  | { type: 'simulation.updateSteps'; steps: StreamlangStepWithUIAttributes[] };

interface InteractiveModeParentSnapshot {
  context: {
    simulatorRef: SimulationActorRef;
    dataSourcesRefs: DataSourceActorRef[];
    // Error state from parent (needed for hasErrorsInParentSnapshot check)
    schemaErrors: string[];
    validationErrors: Map<string, unknown>;
  };
}

// Lock down the things we actually need access to on the parent
export interface InteractiveModeParentRef {
  getSnapshot(): InteractiveModeParentSnapshot;
  send: (event: InteractiveModeToParentEvent) => void;
}

export interface InteractiveModeContext {
  // Step refs that mirror the current state of steps
  stepRefs: StepActorRef[];
  // Initial step refs from persisted definition (for change detection)
  initialStepRefs: StepActorRef[];
  // Parent machine ref for communication
  parentRef: InteractiveModeParentRef;
  // Privileges for this stream
  privileges: StreamPrivileges;
  // Current simulation mode based on the active data source
  simulationMode: DataSourceSimulationMode;
  // Stream name for pipeline suggestion
  streamName: string;
  // AI suggested pipeline suggestion, if any.
  suggestedPipeline?: StreamlangDSL;
  // Currently selected condition for filtering steps
  selectedConditionId?: string;
  // Shared grok collection for pattern definitions
  grokCollection: GrokCollection;
}

export interface InteractiveModeInput {
  // Initial DSL to convert to step refs
  dsl: StreamlangDSL;
  // Steps within the DSL that should be treated as new
  newStepIds: string[];
  // Reference to parent machine
  parentRef: InteractiveModeParentRef;
  // Privileges for this stream
  privileges: StreamPrivileges;
  // Current simulation mode based on the active data source
  simulationMode: DataSourceSimulationMode;
  // Stream name for pipeline suggestion
  streamName: string;
  // Shared grok collection for pattern definitions
  grokCollection: GrokCollection;
}

export type InteractiveModeEvent =
  | { type: 'step.edit' }
  | { type: 'step.cancel' }
  | { type: 'step.save'; id: string }
  | {
      type: 'step.changeProcessor';
      id: string;
      step: StreamlangProcessorDefinition;
    }
  | {
      type: 'step.changeCondition';
      id: string;
      step: StreamlangConditionBlock;
    }
  | { type: 'step.change'; id: string }
  | { type: 'step.parentChanged'; id: string }
  | { type: 'step.delete'; id: string }
  | { type: 'step.reorder'; stepId: string; direction: 'up' | 'down' }
  | {
      type: 'step.reorderByDragDrop';
      sourceStepId: string;
      targetStepId: string;
      operation: 'before' | 'after' | 'inside';
    }
  | {
      type: 'step.addProcessor';
      processor?: StreamlangProcessorDefinition;
      options?: { parentId: StreamlangStepWithUIAttributes['parentId'] };
    }
  | {
      type: 'step.addCondition';
      condition?: StreamlangConditionBlock;
      options?: { parentId: StreamlangStepWithUIAttributes['parentId'] };
    }
  | { type: 'step.duplicateProcessor'; processorStepId: string }
  | { type: 'step.filterByCondition'; conditionId: string }
  | { type: 'step.clearConditionFilter' }
  | {
      type: 'dataSource.activeChanged';
      simulationMode: DataSourceSimulationMode;
    }
  // Suggestions
  | { type: 'suggestion.generate'; connectorId: string }
  | { type: 'suggestion.cancel' }
  | { type: 'suggestion.accept' }
  | { type: 'suggestion.dismiss' }
  | { type: 'suggestion.regenerate'; connectorId: string }
  | { type: 'step.resetSteps'; steps: StreamlangDSL['steps'] };
