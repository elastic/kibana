/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Condition, FlattenRecord } from '@kbn/streams-schema';
import { ActorRef, Snapshot } from 'xstate5';
import { APIReturnType, StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { IToasts } from '@kbn/core/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { PreviewDocsFilterOption } from './preview_docs_filter';
import {
  DateRangeToParentEvent,
  DateRangeActorRef,
} from '../../../../../state_management/date_range_state_machine';
import { ProcessorDefinitionWithUIAttributes } from '../../types';
import { SchemaField } from '../../../schema_editor/types';

export type Simulation = APIReturnType<'POST /api/streams/{name}/processing/_simulate'>;
export type DetectedField = Simulation['detected_fields'][number];

export interface SimulationMachineDeps {
  data: DataPublicPluginStart;
  streamsRepositoryClient: StreamsRepositoryClient;
  toasts: IToasts;
}

export interface SimulationToParentEvent {
  type: 'simulation.change';
}

export type SimulationParentActor = ActorRef<Snapshot<unknown>, SimulationToParentEvent>;

export type ProcessorMetrics =
  Simulation['processors_metrics'][keyof Simulation['processors_metrics']];

export interface SimulationInput {
  parentRef: SimulationParentActor;
  processors: ProcessorDefinitionWithUIAttributes[];
  streamName: string;
}

export type SimulationEvent =
  | DateRangeToParentEvent
  | { type: 'simulation.changePreviewDocsFilter'; filter: PreviewDocsFilterOption }
  | { type: 'processors.change'; processors: ProcessorDefinitionWithUIAttributes[] };

export interface SimulationContext {
  dateRangeRef: DateRangeActorRef;
  detectedSchemaFields: SchemaField[];
  parentRef: SimulationParentActor;
  previewDocsFilter: PreviewDocsFilterOption;
  previewDocuments: FlattenRecord[];
  processors: ProcessorDefinitionWithUIAttributes[];
  samples: FlattenRecord[];
  samplingCondition?: Condition;
  simulation?: Simulation;
  streamName: string;
}
