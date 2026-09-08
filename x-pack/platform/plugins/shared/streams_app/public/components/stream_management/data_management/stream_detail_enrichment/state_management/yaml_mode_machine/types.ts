/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AdditiveChangesResult, StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import type { StreamlangDSL } from '@kbn/streamlang/types/streamlang';
import type { StreamPrivileges } from '../stream_enrichment_state_machine/types';
import type { DataSourceSimulationMode } from '../data_source_state_machine';

interface YamlModeParentSnapshot {
  context: {
    schemaErrors: string[];
    validationErrors: Map<string, unknown>;
  };
}

export interface YamlModeContext {
  // The current DSL being edited
  nextStreamlangDSL: StreamlangDSL;
  // The last persisted DSL (for diff calculation)
  previousStreamlangDSL: StreamlangDSL;
  // The additive changes between previous and next
  additiveChanges: AdditiveChangesResult;
  // Parent machine ref for communication
  parentRef: YamlModeParentActor;
  // Privileges for this stream
  privileges: StreamPrivileges;
  // Current simulation mode based on the active data source
  simulationMode: DataSourceSimulationMode;
}

export interface YamlModeParentActor {
  getSnapshot(): YamlModeParentSnapshot;
  send: (event: YamlModeToParentEvent) => void;
}

type YamlModeToParentEvent =
  | { type: 'mode.dslUpdated'; dsl: StreamlangDSL }
  | { type: 'simulation.reset' }
  | { type: 'simulation.updateSteps'; steps: StreamlangStepWithUIAttributes[] };

export interface YamlModeInput {
  // Currently persisted DSL
  previousStreamlangDSL: StreamlangDSL;
  // Currently edited DSL
  nextStreamlangDSL: StreamlangDSL;
  // Reference to parent machine
  parentRef: YamlModeParentActor;
  // Privileges for this stream
  privileges: StreamPrivileges;
  // Current simulation mode based on the active data source
  simulationMode: DataSourceSimulationMode;
}

export type YamlModeEvent =
  | {
      type: 'yaml.contentChanged';
      streamlangDSL: StreamlangDSL;
      yaml: string;
    }
  | { type: 'yaml.runSimulation'; stepIdBreakpoint?: string }
  | {
      type: 'dataSource.activeChanged';
      simulationMode: DataSourceSimulationMode;
    };
