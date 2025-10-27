/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnyActorRef } from 'xstate5';
import type { DraftGrokExpression } from '@kbn/grok-ui';
import type {
  StreamlangProcessorDefinition,
  StreamlangStepWithUIAttributes,
  StreamlangWhereBlockWithUIAttributes,
} from '@kbn/streamlang';

export type StepToParentEvent =
  | { type: 'step.cancel'; id: string }
  | { type: 'step.change'; id: string }
  | { type: 'step.delete'; id: string }
  | { type: 'step.edit' }
  | { type: 'step.save'; id: string };

export interface StepInput {
  parentRef: StepParentActor;
  step: StreamlangStepWithUIAttributes;
  isNew?: boolean;
  isUpdated?: boolean;
}

export type StepParentActor = Omit<AnyActorRef, 'send'> & {
  send: (event: StepToParentEvent) => void;
};

export interface GrokProcessorResources {
  grokExpressions: DraftGrokExpression[];
}

export type ProcessorResources = GrokProcessorResources;

export interface StepContext {
  parentRef: StepParentActor;
  previousStep: StreamlangStepWithUIAttributes;
  step: StreamlangStepWithUIAttributes;
  // Additional resources to interact with the processor, these aren't persisted but facilitate certain UI functionality.
  resources?: ProcessorResources;
  isNew: boolean;
  isUpdated?: boolean;
}

export type StepEvent =
  | { type: 'step.cancel' }
  | {
      type: 'step.changeProcessor';
      step: StreamlangProcessorDefinition;
      resources?: ProcessorResources;
    }
  | {
      type: 'step.changeCondition';
      step: StreamlangWhereBlockWithUIAttributes;
    }
  | { type: 'step.delete' }
  | { type: 'step.edit' }
  | { type: 'step.save' };
