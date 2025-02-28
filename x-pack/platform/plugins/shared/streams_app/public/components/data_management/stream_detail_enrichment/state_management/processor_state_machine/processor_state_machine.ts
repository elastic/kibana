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
  /** @xstate-layout N4IgpgJg5mDOIC5QAcBOB7AxnW7UDoBXAO1TnQBsA3SAYgG0AGAXURXVgEsAXT9YtiAAeiAIwBWRvgBsAZlHSALIwCcADllqA7I0WyANCACeYrbPyzlAJkbiJKxWpVWrAX1eG0WHHiKly1HT0oqxIIMgcPHwCYSIIALSiWlr4KuKysoyy4lbZKtmGJghWiimaZgpJGVpJ7p4Y2LC4BBCoAIYAZtz4kFHEULRejc34sNxtMEyh7Fy8-IJxSSmSuk5aiiqMZuLihYjiKqL4igfiZk4OerJ14Q0+Le1dPRB9A0P3+JhtxNgUU4IRWbRBaIWRyfBqaTiRTSBziNRWNaKPYIUpWVKiLa5MGyEpqNQ3d5NXytTrdXq8fqDO7EghfH5gP4hAGROYxUBxWSbGTwk6WaQ6LTaZHGRDSXT4LRnIUrRj4lyEmkjUlPCmcKlEkaYAAW30mLBZQPmsUQiIhWgFAvscmkogMooQ1VSVnOGksKjkWkV3lp+BV3Uw-A6nFQAFt1VAACKcWBfVAQADCuv6cFoEH4YHw6qo6AA1pnNSTHgGgyHw-1o7G2vGk3q4Ahs1g2mypv8woCosaOYh8Yp8IxcrDpAj5HatCiwX3RM4NooFFYHPlvcMi2TPqWwxHK3HE8mYLBaGBUBgCMgKM2OnhQ-hCw814HiMHNxWYzvaynYA3iDmvi2WG2Zk7dlhFBAcZCsTEtCsM4bCULYJwRSUDnWXFbFEE43A8W4fS1UsoEIMgICzCAKDAakcN8CkAPCVlgRNBBpzUY41FEF1RDUOcVHyFQUQ9I5pDkLY7AFFxpGXD4H2DfDCOeHhZMpN4lV8QhkAgZswGojs2RBBJWJSDilnYxRHF0dReMkfBEQHXQXS2LixKw2910fThpMgeT5IjciVzpb5fk02iuxA4otmOFQhSg6D1hcKwUVEadzHC5JbTkO0nHEcTfUk1yCPcilPI1JTfIZJlphoo1gM5aR0WyWx5AXEo9DkczpElRg5GqdLwoyxyiucqTcqI-K1UKiiWkZMBuA0g120CyrEEcJj2JyTRcXQw4kjijYVH7eKHCxG1REy3CXLcoaXnJC6vKcnU6wCiqdPiC1JVxSwbIcBRNDi3EmPFBwSnCva52O3xsrOjzsufKNX2rXc6wPdNiEzRt8xvPqwcGiGN3LaGqxrPd60bX9olbGbAO0+ioR2hdWLSSE1tyFEEVaz65y5BEIIgkG6TwzH8shnHt1h9990PY9fDPC8rzRsb+pymT+exrcYfx+Gvx-ZsSf-MnyqAnSdnESyzGq8Q5HSSxYodO1GCkHIbZKeLYQgxRubl8HFZcqHIwmqaAAUirTDMs2-PMC3R3mFYuuWvZ9sB-bG9Wmz-Zh7r1+j8SYtQdigtQtlHWRxwdLRDlSRQbHC5RKgkV2McjuSBa3WP458sWTxvc9uEvMMZZ8t2+ajhuKyborE+J-hSbKrS6O7BADaNsFoLNjIy++56sjsMFNhOeL3Cw4h0AgOAASKw005n+IXENtIMnX3IDgKB0uUlD1h3apJoIOBRXZIMhcECCBT4U3PhII419lB2CsAJdiug4ouksi-CueIziOFdv6QB09gqJB2qxV6iJlA4m0CiaCUgy7nHspAjYHFUHFgKlAdBQU4i5COIwKupQNh5x2CiNEGIsQZDkHiAkvVZb+mjoLFWcMPz0PmrPFhqQPoSEkNkGElsijZCOJAzYOhbS6GyKbGuEdIBSMekkQ2BlkhGRMpQlE5wZAdUBusbRPV6iy1ru5TgJEwBGPouhQ2A4diei2AORwhciiQlalCTEzh2o1A5vo06-ceBeOASUF6uRlBlw+nINQcVMStVKMkZIdh4o1GuEI3urjzpyRGnQ2aD107hPxIcJwHEtjJB4lbaCU4hwc1YlCXIcSBp1xLJ7MReMJH7iScFYuUgsjig-tkZe2SraoRkBoZRLoSgrQGfLPKA8lZD1In7E+tSz5TKcJKE2+J16LK2lCfAdgzCbwHOhVQqDY4AJOUA4K2hDaaFMs4SBkCsgomQRYH5aFpRGV3q4IAA */
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
