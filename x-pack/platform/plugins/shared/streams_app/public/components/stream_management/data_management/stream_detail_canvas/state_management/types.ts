/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { XYPosition } from '@xyflow/react';
import type { StreamsUnit } from '@kbn/streams-schema';
import type { Unit, UnitRepository } from '../../../../../services/unit_repository';
import type { ProcessingNodeRef, UnitLine } from '../../../../../services/unit_graph';
import type { RoutingDiagnostic } from '../../../../../services/unit_diagnostics';
import type {
  ProcessingFlyoutActorRef,
  ProcessingSaveRequest,
  ProcessingStepPosition,
} from '../../../../stream_processing_flyout/state_management/processing_flyout_machine';
import type {
  RoutingFlyoutActorRef,
  RoutingFlyoutTarget,
  RoutingSaveRequest,
} from '../../../../stream_routing_flyout/state_management/routing_flyout_machine';
import type {
  DestinationsActorRef,
  DestinationsTimeDeps,
} from '../../../../streams_layout/destinations/state_machines/destinations_state_machine';
import type { SourcesActorRef } from '../../../../streams_layout/sources/state_machines/sources_state_machine';
import type { SourceApiKeyGenerationDeps } from '../../../../streams_layout/sources/source_api_keys';
import type { SourceEnvironmentLoader } from '../../../../streams_layout/sources/source_environment';

/** Undo steps for a source or destination create, driven by the canvas save transitions. */
export interface CanvasCreateHistoryHandlers {
  hold: () => void;
  /** Clear the stack after a successful persist so undo cannot restore revoked keys. */
  reset: () => void;
  discard: () => void;
}

export interface CanvasCreateHistoryRef {
  current: CanvasCreateHistoryHandlers;
}

export interface CanvasStateServiceDeps extends DestinationsTimeDeps {
  core: CoreStart;
  urlStateStorageContainer: IKbnUrlStateStorage;
  apiKeyGenerationDeps: SourceApiKeyGenerationDeps;
  loadSourceEnvironment?: SourceEnvironmentLoader;
  loadUnitDefinition: UnitRepository['load'];
  persistUnitDefinition: UnitRepository['persist'];
  validateUnitDefinition?: (input: UnitValidationInput) => Promise<void>;
}

export interface UnitValidationInput {
  unit: Unit;
  checkConnections: boolean;
}

export type CanvasFlyoutKind = 'destination' | 'index';

export interface CanvasUrlInput {
  flyoutName: string | null;
  flyoutKind: CanvasFlyoutKind | null;
  flyoutTab: string | null;
  query: string | null;
}

export const defaultCanvasUrlState: CanvasUrlInput = {
  flyoutName: null,
  flyoutKind: null,
  flyoutTab: null,
  query: null,
};

export interface CanvasProcessingFlyout {
  slot: ProcessingNodeRef;
  ref: ProcessingFlyoutActorRef;
  /** Set when `slot` is the pipeline a shared source line moves onto when the processing saves. */
  line?: UnitLine;
}

export interface CanvasRoutingFlyout {
  /** A new routing node on a line, or an existing routing node. */
  target: RoutingFlyoutTarget;
  /** Unset when the target cannot be configured. */
  ref?: RoutingFlyoutActorRef;
}

export interface CanvasState {
  urlState: CanvasUrlInput;
  unit: Unit;
  nextUnit: Unit;
  savingUnit?: Unit;
  savingComponentIds?: string[];
  savingComponentKind?: 'source' | 'destination';
  savingComponentIntent?: 'create' | 'delete' | 'connect' | 'processing';
  savingSecrets?: StreamsUnit.Secrets;
  routingFlyout?: CanvasRoutingFlyout;
  processingFlyout?: CanvasProcessingFlyout;
  /** Staged unit to return to when a processing flyout save fails. */
  processingRollbackUnit?: Unit;
  /** Processor ids written for the flyout's steps, in step order, while they save. */
  processingSaveIds?: string[];
  nodePositions: Record<string, XYPosition>;
  /** Diagnostics of the last failed save that point at routing nodes of `nextUnit`. */
  routingDiagnostics?: RoutingDiagnostic[];
  sourcesRef: SourcesActorRef;
  destinationsRef: DestinationsActorRef;
  error?: Error;
}

export type CanvasUrlEvent =
  | { type: 'url.init'; urlState: CanvasUrlInput }
  | { type: 'url.sync'; replace?: boolean }
  | {
      type: 'unit.changed';
      unitDefinition: Unit;
      sourceIds: string[];
      intent: 'create' | 'delete';
    }
  | {
      type: 'unit.changed';
      unitDefinition: Unit;
      destinationIds: string[];
      intent: 'create' | 'delete';
      secrets?: StreamsUnit.Secrets;
    }
  | {
      type: 'unit.changed';
      unitDefinition: Unit;
      intent: 'connect';
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
      /** `unitDefinition` is the unit as stored; `stagedUnitDefinition` keeps wiring the save left out. */
      output: { unitDefinition: Unit; stagedUnitDefinition: Unit };
    }
  | { type: 'xstate.error.actor.persistUnitDefinition'; error: unknown }
  | { type: 'flyout.open'; flyoutName: string; flyoutKind?: CanvasFlyoutKind }
  | { type: 'flyout.tab'; flyoutTab: string }
  | { type: 'flyout.close' }
  | { type: 'search.change'; query: string }
  | { type: 'routing.open'; target: RoutingFlyoutTarget; readOnly?: boolean }
  | { type: 'routing.close' }
  | RoutingSaveRequest
  | {
      type: 'processing.open';
      slot: ProcessingNodeRef;
      /** Starts creating a processor at this end of the slot's list. */
      position?: ProcessingStepPosition;
    }
  | { type: 'processing.open'; line: UnitLine }
  | { type: 'processing.close' }
  | ProcessingSaveRequest;
