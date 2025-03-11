/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorDefinition } from '@kbn/streams-schema';
import { ActorRef, Snapshot } from 'xstate5';
import { ProcessorDefinitionWithUIAttributes } from '../../types';

export type ProcessorToParentEvent =
  | { type: 'processor.change'; id: string }
  | { type: 'processor.delete'; id: string }
  | { type: 'processor.stage' };

export interface ProcessorInput {
  parentRef: ProcessorParentActor;
  processor: ProcessorDefinitionWithUIAttributes;
  isNew?: boolean;
}

export type ProcessorParentActor = ActorRef<Snapshot<unknown>, ProcessorToParentEvent>;

export interface ProcessorContext {
  parentRef: ProcessorParentActor;
  previousProcessor: ProcessorDefinitionWithUIAttributes;
  processor: ProcessorDefinitionWithUIAttributes;
  isNew: boolean;
  isUpdated?: boolean;
}

export type ProcessorEvent =
  | { type: 'processor.cancel' }
  | { type: 'processor.change'; processor: ProcessorDefinition }
  | { type: 'processor.delete' }
  | { type: 'processor.edit' }
  | { type: 'processor.stage' }
  | { type: 'processor.update' };

export interface ProcessorEmittedEvent {
  type: 'processor.changesDiscarded';
}
