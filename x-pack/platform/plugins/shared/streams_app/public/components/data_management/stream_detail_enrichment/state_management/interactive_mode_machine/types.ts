/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  StreamlangProcessorDefinition,
  StreamlangStepWithUIAttributes,
} from '@kbn/streamlang';
import type { StreamlangDSL, StreamlangWhereBlock } from '@kbn/streamlang/types/streamlang';
import type { DraftGrokExpression } from '@kbn/grok-ui';
import type { SimulationActorRef } from '../simulation_state_machine';
import type { DataSourceSimulationMode } from '../data_source_state_machine';
import type { StepActorRef } from '../steps_state_machine';
import type { StreamPrivileges } from '../stream_enrichment_state_machine/types';

export type InteractiveModeToParentEvent =
  | { type: 'mode.dslUpdated'; dsl: StreamlangDSL }
  | { type: 'simulation.reset' }
  | { type: 'simulation.updateSteps'; steps: StreamlangStepWithUIAttributes[] };

interface InteractiveModeParentSnapshot {
  context: {
    simulatorRef: SimulationActorRef;
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
}

export type InteractiveModeEvent =
  | { type: 'step.edit' }
  | { type: 'step.cancel' }
  | { type: 'step.save'; id: string }
  | {
      type: 'step.changeProcessor';
      id: string;
      step: StreamlangProcessorDefinition;
      resources?: { grokExpressions?: DraftGrokExpression[] };
    }
  | {
      type: 'step.changeCondition';
      id: string;
      step: StreamlangWhereBlock;
    }
  | { type: 'step.change'; id: string }
  | { type: 'step.delete'; id: string }
  | { type: 'step.reorder'; stepId: string; direction: 'up' | 'down' }
  | {
      type: 'step.addProcessor';
      processor?: StreamlangProcessorDefinition;
      options?: { parentId: StreamlangStepWithUIAttributes['parentId'] };
    }
  | {
      type: 'step.addCondition';
      condition?: StreamlangWhereBlock;
      options?: { parentId: StreamlangStepWithUIAttributes['parentId'] };
    }
  | { type: 'step.duplicateProcessor'; processorStepId: string }
  | {
      type: 'dataSource.activeChanged';
      simulationMode: DataSourceSimulationMode;
    };
