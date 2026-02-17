/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnyActorRef } from 'xstate';
import type { GrokCollection } from '@kbn/grok-ui';
import type {
  StreamlangProcessorDefinition,
  StreamlangStepWithUIAttributes,
  StreamlangConditionBlockWithUIAttributes,
} from '@kbn/streamlang';

export type StepToParentEvent =
  | { type: 'step.cancel'; id: string }
  | { type: 'step.change'; id: string }
  | { type: 'step.parentChanged'; id: string }
  | { type: 'step.delete'; id: string }
  | { type: 'step.edit' }
  | { type: 'step.save'; id: string };

export interface StepInput {
  parentRef: StepParentActor;
  step: StreamlangStepWithUIAttributes;
  isNew?: boolean;
  isUpdated?: boolean;
  grokCollection: GrokCollection;
}

export type StepParentActor = Omit<AnyActorRef, 'send'> & {
  send: (event: StepToParentEvent) => void;
};

export interface StepContext {
  parentRef: StepParentActor;
  previousStep: StreamlangStepWithUIAttributes;
  step: StreamlangStepWithUIAttributes;
  isNew: boolean;
  isUpdated?: boolean;
  grokCollection: GrokCollection;
}

export type StepEvent =
  | { type: 'step.cancel' }
  | {
      type: 'step.changeProcessor';
      step: StreamlangProcessorDefinition;
    }
  | {
      type: 'step.changeCondition';
      step: StreamlangConditionBlockWithUIAttributes;
    }
  | {
      type: 'step.changeDescription';
      description?: string;
    }
  | {
      type: 'step.changeParent';
      parentId: string | null;
    }
  | { type: 'step.delete' }
  | { type: 'step.edit' }
  | { type: 'step.save' };
