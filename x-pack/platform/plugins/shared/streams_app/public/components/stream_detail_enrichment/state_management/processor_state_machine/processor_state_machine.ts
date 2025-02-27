/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ActorRefFrom, MachineImplementationsFrom, assign, emit, sendTo, setup } from 'xstate5';
import { isEqual } from 'lodash';
import { OverlayStart } from '@kbn/core/public';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import { ProcessorDefinition, getProcessorType } from '@kbn/streams-schema';
import { ProcessorInput, ProcessorContext, ProcessorEvent, ProcessorEmittedEvent } from './types';
import {
  createConfirmPromptActor,
  deleteProcessorPromptInput,
  discardChangesPromptInput,
} from './confirm_prompt_actor';

export type ProcessorActorRef = ActorRefFrom<typeof processorMachine>;

export const processorMachine = setup({
  types: {
    input: {} as ProcessorInput,
    context: {} as ProcessorContext,
    events: {} as ProcessorEvent,
    emitted: {} as ProcessorEmittedEvent,
  },
  actors: {
    confirmPrompt: getPlaceholderFor(createConfirmPromptActor),
  },
  actions: {
    changeProcessor: assign(({ context }, params: { processor: ProcessorDefinition }) => ({
      processor: {
        id: context.processor.id,
        type: getProcessorType(params.processor),
        ...params.processor,
      },
    })),
    restoreInitialProcessor: assign(({ context }) => ({
      processor: context.initialProcessor,
    })),
    updateProcessor: assign(({ context }) => ({
      initialProcessor: context.processor,
      isUpdated: true,
    })),
    notifyProcessorChange: sendTo(({ context }) => context.parentRef, { type: 'processor.change' }),
    notifyProcessorDelete: sendTo(
      ({ context }) => context.parentRef,
      ({ context }) => ({
        type: 'processor.delete',
        id: context.processor.id,
      })
    ),
    emitChangesDiscarded: emit({ type: 'processor.changesDiscarded' }),
  },
  guards: {
    isDraft: ({ context }) => context.isNew,
    hasEditingChanges: ({ context }) => !isEqual(context.initialProcessor, context.processor),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAcBOB7AxnW7UDoBXAO1TnQBsA3SAYgG0AGAXURXVgEsAXT9YtiAAeiAIwB2AGz5xAZgAss8QFYANCACeiZcoBM+RgA5ZJ+fMO6AnJN3KAvnfVosOPEVLlqdeqNZIQyBw8fAL+IggS0nKKKupaCIai+MqMqYyiovLWVqIOThjYsLgEEKgAhgBm3PiQwcRQtM6Fxfiw3GUwTH7sXLz8guGiurJJ4owjtnGIuqKyMtaGUpnZlqKSeQEFriXlVTUQdQ1N2-iYZcTYFF2Cgb0hA9o2MvIzi2qaiPKihslp6cs2VbrRybFxFNylSrVWq8eqNLbgghnC5gK6+G5BPqhUDhPRTCKSRYyIwmZSSWS2IEbY6I-CQvYwzhwmktTAAC3OnRYGLu-TCiAUlnwojJkw+CF0hnkzyUygyWUBs2pCJa9OqmH4FU4qAAtkyoAARTiwM6oCAAYQ59TgtAg-DA+CZVHQAGsHSyIbt1ZrtXr6kaTWUzZbOXAEE6sGUsV1rv5bsE+TjEDZ8SLJMp8MMJHJZpS1sqwaqvacfbr9QHTRarTBYLQwKgMARkBQoxU8Dr8B6dlCS8QtWX-cbKyHrbBw8RnWdoyxYz0E9jhMnJElLFJRe94kokn9-gqcsD8oW3Bq+5woIQyBBHRAKGB4UeCDDZwFMfd+REJPjLLZksZSeS8wPUFmmPH1z0vfYeEg2EjhVNxCGQCAozAZ94yxB4IkYdNhQkb5YnFVdpBJf8KWUKkQS7XstXAyBoOg-V7xApFzkuVDX0TRcEFkSwM2UQwyNlVMRiSSQeJGeRxEsb8+NkAsmKos8L1omF6OZODmJRNFuhfXkF0GLCMwycQ8I3MQhmkMxdGMrDSPIw95JPailKvFTGTUh86VRMBuBQ7k43YvSBR438BPw+JMgkYUxMySTpOMOSTkcxSINcg4YMYxLq187S0LfJMIjxcUhnEaUMkYLITDGQlxAS2kkpoly0oUgdDSHIMq1DWs7WIB0IzdTt1IUhq6KSlqK3akca3HScoxCGM-LndD31EAycOMt5U10LJ8ClQxrBsvNZIowb6uckbSz9VrA2DLLa3rRtOxbbg211AaPNOlKmtGy7xpuzrpsjadmDY3SMKyaULHGIZTIiXRJFK6KJKk2x4uO96wLOlTvvLLyfIABXU217UdCdXXdE6Mc+qDsf9XGwAJh8AanOaZwWnT5wwkURhkEzU3kQl8B4v8yVs-M0YcynlK+i6cdvfHCfutxm1bds3ol09hqxmXabl+n1KZ2b+HmnKArByxpTFcLZFE-BROUcTYpRo6QWIdAIDgG51J5Dn3wAWkkfF-dqloSDIXAvAgb2lvyl58UMaQ1kkJPxESQFlHEGrxZONUo7yzjZHSYV11TVdMxiOUARyI77Oz4s3KgXOOPCbifhUbisMtz5ZiLtJ5RWJUs9pNVmp+tq-tHRvAoQVZxFt4vxVkCwDD-BRzCsGwJOD0CNecyeMLJOPF+XkxV4sbJ7EH1lJavTgbzAPflq+OZXjCsRJSid-zFzMixZrurr+gg-fKK15CpkiLbRGjsZJbyRAA1KhwgGcV0IXMia4bApD+LIPmjB9BykkCVSqWFFgwKGpjaWp4xpjw6hPfyoN3wqEYMkTaKhMwp3hokUWQFKIfSltTbWho6YMyYog8IDCmFFUXowjO8cv6cJIe7XWkdaE+3yvgkuxlMzERFoBBwDggA */
  id: 'processor',
  context: ({ input }) => ({
    parentRef: input.parentRef,
    initialProcessor: input.processor,
    processor: input.processor,
    isNew: input.isNew ?? false,
  }),
  initial: 'unresolved',
  states: {
    unresolved: {
      always: [{ target: 'draft', guard: 'isDraft' }, { target: 'configured' }],
    },
    draft: {
      initial: 'editing',
      states: {
        editing: {
          on: {
            'processor.stage': {
              target: '#configured',
              actions: [{ type: 'updateProcessor' }, { type: 'notifyProcessorChange' }],
            },
            'processor.cancel': [
              {
                guard: 'hasEditingChanges',
                target: 'confirmingDiscardChanges',
              },
              {
                target: '#deleted',
              },
            ],
            'processor.change': {
              actions: [
                { type: 'changeProcessor', params: ({ event }) => event },
                { type: 'notifyProcessorChange' },
              ],
            },
          },
        },
        confirmingDiscardChanges: {
          invoke: {
            src: 'confirmPrompt',
            input: discardChangesPromptInput,
            onDone: {
              target: '#deleted',
              actions: [{ type: 'restoreInitialProcessor' }],
            },
            onError: 'editing',
          },
        },
      },
    },
    configured: {
      id: 'configured',
      initial: 'idle',
      states: {
        idle: {
          on: { 'processor.edit': 'edit' },
        },
        edit: {
          initial: 'editing',
          states: {
            editing: {
              on: {
                'processor.update': {
                  guard: 'hasEditingChanges',
                  target: '#configured.idle',
                  actions: [{ type: 'updateProcessor' }, { type: 'notifyProcessorChange' }],
                },
                'processor.cancel': [
                  {
                    guard: 'hasEditingChanges',
                    target: 'confirmingDiscardChanges',
                  },
                  {
                    target: '#configured.idle',
                    actions: [{ type: 'notifyProcessorChange' }, { type: 'emitChangesDiscarded' }],
                  },
                ],
                'processor.delete': 'confirmingDeleteProcessor',
                'processor.change': {
                  actions: [
                    { type: 'changeProcessor', params: ({ event }) => event },
                    { type: 'notifyProcessorChange' },
                  ],
                },
              },
            },
            confirmingDiscardChanges: {
              invoke: {
                src: 'confirmPrompt',
                input: discardChangesPromptInput,
                onDone: {
                  target: '#configured.idle',
                  actions: [
                    { type: 'restoreInitialProcessor' },
                    { type: 'notifyProcessorChange' },
                    { type: 'emitChangesDiscarded' },
                  ],
                },
                onError: 'editing',
              },
            },
            confirmingDeleteProcessor: {
              invoke: {
                src: 'confirmPrompt',
                input: deleteProcessorPromptInput,
                onDone: '#deleted',
                onError: 'editing',
              },
            },
          },
        },
      },
    },
    deleted: {
      id: 'deleted',
      type: 'final',
      entry: [{ type: 'notifyProcessorDelete' }],
    },
  },
});

export const createProcessorMachineImplementations = ({
  overlays,
}: {
  overlays: OverlayStart;
}): MachineImplementationsFrom<typeof processorMachine> => ({
  actors: {
    confirmPrompt: createConfirmPromptActor({ overlays }),
  },
});
