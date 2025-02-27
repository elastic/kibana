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
  /** @xstate-layout N4IgpgJg5mDOIC5QAcBOB7AxnW7UDoBXAO1TnQBsA3SAYgG0AGAXURXVgEsAXT9YtiAAeiAIwB2AGz5xAZgAssgBwAmcaMYaAnBIA0IAJ6IArMZX5GS2QtGTGW45JXGAvi-1osOPEVLlqdPSirEggyBw8fAKhIggS0nKKquqa9nqGiEqi+PJaeVqyplrqWSpuHhjYsLgEEKgAhgBm3PiQkcRQtJ5VNfiw3PUwTCHsXLz8grGiKtP4pblW4vKMhSr6RggzsjJakkpZxqL7Ssby4uVhld61Dc2tEO2d3df4mPXE2BTDguFjUZMmcSMfDGcRZM7GWQSYqSdaIeRHEGMZGMSSSAoqFQ6C7Pao+OpNFptXgdLpXPEEN4fMBfYI-CLjaKgWJmOFxNHA8SmUSyXaSYxaFSSHHk3oEu7Ezik3G9TAAC3eQxY9L+ExiiAUWnwokcKiUknkZnkTnkbL18hkinUguMK31Iq8FPw4pamH4jU4qAAtlKoAARTiwN6oCAAYQVHTgtAg-DA+ClVHQAGs4zL8bdXe7PT6OgGg-UQ+HFXAEAmsPVGcNvqFfpE1czEE42TrlPg1CdEvITlZZA6eunCa8s97fXng2GIzBYLQwKgMARkBQK408F78GmboO3cQPSPc4Hx0XI7BS8RE29Kyxq6M60zhIhxEKLAUll3bJIoWsMghZOoLCjGExeRMTMMp3EuR1ZSzKBCDICB4wgCgwDJSCfGJa8wgZf51TidINhtEEex1dF5ENJw+xebcPRguD7h4OiSSeUUfEIZAIArMAMNrRkATiRhjTbFYURmURdlNb8YQsIjjTBUT1Aop0qM4GjIAYhjfRQ-tKXeT4uKw+t7wQZZtmAo5lCEmTjGbc1LSAyQuVRCQlAUqCd2U2DVOJdTpWY7TqVpEZMNVO8pn46QVCE5ERLE5t7C1LsxKsCLllsFyfCUlT4K8yUfNQ2oaTAbhOOVGt9JC+EVhyGYrCUCz7Ks78eS0YEVGAvVZGRVR9nOcCNyHNzMrUnKmLy15J2KwLuOwhs4lZRrWvEbVQVtBRMW6nqKlGjKPKyh5Mzcvd-QPAsJ2LacY2IOMyxTddfP66idrUpTDrHE6jynU9zwrKIqxKm8eJwjQBIijqotEUSDWszE5gcfYYXUQo0spaDHq856cyO-NC3G6dZ3ndcl24FdvVuraUdotHhwx17sbOz7y0vZg9OC3jTCUfAX0USEW00URrN-NtTN2CLRMYUwkfu9yKb2yWXoKoqAAVfOjWN4zPZNUzu7bpfo9HR3lsAlby+mLx+q8-qC29eJ1WZarOEWCl5WFGtI8xkW55riikGYJe1zyZb13MDaNrSZznHxF2XVdSa0yXBspg7qeD3yTe+-hfsmsrWeMdnOcKKFIV55tVts2RWv5W0ITccDiHQCA4B+XyVStnCAFpnY2dv-wAnuUQ2iDY5IMhcACCBm4BmbgLZfVtTRNEEVBLm9Qll1x+mwyOuyYi9QNI0TWbYpBd-UQETsE+MRXjNvKgNeDNiZZzHs0SoWsXmzjZBFth1FF7K0Ltxd6ndF0stqbHVpseW+5UEAEVyDMOQ0wHB7A7hqVQUlX6HEAikP+vtyaQEgazZBCAapoMKPZIUWJfw4IGo9TgiEwD4MBryC0HVjTmikEsfY1kBQyC5KCJyCUlDyCoQ9HW3AGEzSBs2c+tkT4LAcH-LQwipb+3osNcRhkIrGBBNvI4eowTGmLlyEEH5Xz6mFuDJR8cA5U1HGA06EDSosxwlydm1gc4ficKoZQDUNjTC7PgMuphDS2GRHkYUgCybUNESA-WSFFZN0cS3GaLiAmFH1LITxKhvHF0hHMZwAp7JWD2EKFeBsx6JInoZeyB9SJtlMFkywwTlBgTcEAA */
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
