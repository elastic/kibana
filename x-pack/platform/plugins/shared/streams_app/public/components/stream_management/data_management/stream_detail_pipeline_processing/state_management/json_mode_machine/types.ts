/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnyActorRef } from 'xstate';
import type { PipelineProcessorsUiDefinition, PipelineStepWithUIAttributes } from '../../types';
import type { DataSourceSimulationMode } from '../data_source_state_machine';

export interface JsonModeContext {
  parentRef: JsonModeParentActor;
  nextPipelineDefinition: PipelineProcessorsUiDefinition;
  previousPipelineDefinition: PipelineProcessorsUiDefinition;
  simulationMode: DataSourceSimulationMode;
  privileges: {
    simulate: boolean;
  };
  schemaErrors: string[];
  validationErrors: Map<string, unknown>;
}

export interface JsonModeParentActor {
  send: AnyActorRef['send'];
}

export interface JsonModeInput {
  parentRef: JsonModeParentActor;
  previousPipelineDefinition: PipelineProcessorsUiDefinition;
  nextPipelineDefinition: PipelineProcessorsUiDefinition;
  simulationMode: DataSourceSimulationMode;
  privileges: {
    simulate: boolean;
  };
  schemaErrors: string[];
  validationErrors: Map<string, unknown>;
}

export type JsonModeEvent =
  | { type: 'mode.definitionUpdated'; definition: PipelineProcessorsUiDefinition }
  | { type: 'simulation.updateSteps'; steps: PipelineStepWithUIAttributes[] }
  | { type: 'json.runSimulation'; stepIdBreakpoint?: string }
  | { type: 'dataSource.activeChanged'; simulationMode: DataSourceSimulationMode }
  | { type: 'mode.schemaErrorsChanged'; errors: string[] }
  | {
      type: 'json.contentChanged';
      pipelineDefinition: PipelineProcessorsUiDefinition;
      json: string;
    };
