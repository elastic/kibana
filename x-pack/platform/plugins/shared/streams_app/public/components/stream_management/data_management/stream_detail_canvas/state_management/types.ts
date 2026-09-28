/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { XYPosition } from '@xyflow/react';
import type { Unit, UnitRepository } from '../../../../../services/unit_repository';
import type { SourcesActorRef } from '../../../../streams_layout/sources/state_machines/sources_state_machine';
import type { SourceApiKeyGenerationDeps } from '../../../../streams_layout/sources/source_api_keys';
import type { SourceEnvironmentLoader } from '../../../../streams_layout/sources/source_environment';

export interface CanvasStateServiceDeps {
  core: CoreStart;
  urlStateStorageContainer: IKbnUrlStateStorage;
  apiKeyGenerationDeps: SourceApiKeyGenerationDeps;
  loadSourceEnvironment?: SourceEnvironmentLoader;
  loadUnitDefinition: UnitRepository['load'];
  persistUnitDefinition: UnitRepository['persist'];
  validateUnitDefinition?: (unit: Unit) => Promise<void>;
}

export interface CanvasUrlInput {
  flyoutName: string | null;
  flyoutTab: string | null;
}

export interface CanvasState {
  urlState: CanvasUrlInput;
  unit: Unit;
  nextUnit: Unit;
  savingUnit?: Unit;
  savingSourceId?: string;
  savingSourceIntent?: 'create' | 'delete';
  nodePositions: Record<string, XYPosition>;
  sourcesRef: SourcesActorRef;
  error?: Error;
}

export type CanvasUrlEvent =
  | { type: 'url.init'; urlState: CanvasUrlInput }
  | { type: 'url.sync' }
  | {
      type: 'unit.changed';
      unitDefinition: Unit;
      sourceId: string;
      intent: 'create' | 'delete';
    }
  | { type: 'unit.stage'; unitDefinition: Unit }
  | { type: 'unit.save' }
  | { type: 'unit.reload' }
  | { type: 'nodes.positions.change'; positions: Record<string, XYPosition> }
  | { type: 'xstate.done.actor.loadUnitDefinition'; output: Unit }
  | { type: 'xstate.error.actor.loadUnitDefinition'; error: unknown }
  | { type: 'xstate.done.actor.validateUnitDefinition'; output: void }
  | { type: 'xstate.error.actor.validateUnitDefinition'; error: unknown }
  | {
      type: 'xstate.done.actor.persistUnitDefinition';
      output: { unitDefinition: Unit; sourceId?: string };
    }
  | { type: 'xstate.error.actor.persistUnitDefinition'; error: unknown }
  | { type: 'flyout.open'; flyoutName: string }
  | { type: 'flyout.tab'; flyoutTab: string }
  | { type: 'flyout.close' };
