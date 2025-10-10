/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ActorRefFrom, MachineImplementationsFrom, SnapshotFrom } from 'xstate5';
import { assign, setup } from 'xstate5';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import type { StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import { createValidationActor } from '../stream_enrichment_state_machine/validation_actor';

export type ValidationActorRef = ActorRefFrom<typeof validationMachine>;
export type ValidationActorSnapshot = SnapshotFrom<typeof validationMachine>;

export interface ValidationInput {
  steps: StreamlangStepWithUIAttributes[];
  streamName: string;
}

export interface ValidationContext {
  steps: StreamlangStepWithUIAttributes[];
  streamName: string;
  validationResult: any;
  validationError: string | null;
}

export interface ValidationEvent {
  type: 'validation.trigger' | 'validation.updateSteps';
  steps?: StreamlangStepWithUIAttributes[];
}

export interface ValidationMachineDeps {
  streamsRepositoryClient: any;
  toasts: any;
}

export const validationMachine = setup({
  types: {
    input: {} as ValidationInput,
    context: {} as ValidationContext,
    events: {} as ValidationEvent,
  },
  actors: {
    runValidation: getPlaceholderFor(createValidationActor),
  },
  actions: {
    storeSteps: assign((_, params: { steps: StreamlangStepWithUIAttributes[] }) => ({
      steps: params.steps,
    })),
    storeValidationResult: assign((_, params: { result: any }) => ({
      validationResult: params.result,
      validationError: null,
    })),
    storeValidationError: assign((_, params: { error: string }) => ({
      validationResult: null,
      validationError: params.error,
    })),
    clearValidation: assign(() => ({
      validationResult: null,
      validationError: null,
    })),
  },
  delays: {
    validationDebounceTime: 500,
  },
}).createMachine({
  id: 'validation',
  context: ({ input }) => ({
    steps: input.steps,
    streamName: input.streamName,
    validationResult: null,
    validationError: null,
  }),
  initial: 'idle',
  on: {
    'validation.updateSteps': {
      target: '.debouncingChanges',
      reenter: true,
      actions: [{ type: 'storeSteps', params: ({ event }) => ({ steps: event.steps || [] }) }],
    },
  },
  states: {
    idle: {
      on: {
        'validation.trigger': 'running',
      },
    },
    debouncingChanges: {
      after: {
        validationDebounceTime: 'running',
      },
    },
    running: {
      invoke: {
        id: 'validationRunner',
        src: 'runValidation',
        input: ({ context }) => ({
          steps: context.steps,
          streamName: context.streamName,
        }),
        onDone: {
          target: 'idle',
          actions: [
            { type: 'storeValidationResult', params: ({ event }) => ({ result: event.output }) },
          ],
        },
        onError: {
          target: 'idle',
          actions: [
            {
              type: 'storeValidationError',
              params: ({ event }) => ({ error: String(event.error) }),
            },
          ],
        },
      },
    },
  },
});

export const createValidationMachineImplementations = ({
  streamsRepositoryClient,
  toasts,
}: ValidationMachineDeps): MachineImplementationsFrom<typeof validationMachine> => ({
  actors: {
    runValidation: createValidationActor({ streamsRepositoryClient, toasts }),
  },
});
