/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ActorRefFrom, assign, forwardTo, sendTo, setup, SnapshotFrom } from 'xstate5';
import { ProcessorDefinition, getProcessorType } from '@kbn/streams-schema';
import { ProcessorInput, ProcessorContext, ProcessorEvent, ProcessorResources } from './types';

export type ProcessorActorRef = ActorRefFrom<typeof processorMachine>;
export type ProcessorActorSnapshot = SnapshotFrom<typeof processorMachine>;

export const processorMachine = setup({
  types: {
    input: {} as ProcessorInput,
    context: {} as ProcessorContext,
    events: {} as ProcessorEvent,
  },
  actions: {
    changeProcessor: assign(
      ({ context }, params: { processor: ProcessorDefinition; resources?: ProcessorResources }) => {
        const type = getProcessorType(params.processor);

        return {
          processor: {
            id: context.processor.id,
            whereParentId: context.processor.whereParentId,
            type,
            ...params.processor,
          },
          resources: params.resources,
        };
      }
    ),
    changeParent: assign(({ context }, params: { parentId?: string }) => ({
      processor: {
        ...context.processor,
        whereParentId: params.parentId,
      },
    })),
    resetToPrevious: assign(({ context }) => ({
      processor: context.previousProcessor,
    })),
    reset: assign(
      ({ context }, params: { processor: ProcessorDefinition; whereParentId?: string }) => {
        const type = getProcessorType(params.processor);
        return {
          processor: {
            id: context.processor.id,
            whereParentId: params.whereParentId,
            type,
            ...params.processor,
          },
          isUpdated: false,
        };
      }
    ),
    markAsUpdated: assign(({ context }) => ({
      previousProcessor: context.processor,
      isUpdated: true,
    })),
    forwardEventToParent: forwardTo(({ context }) => context.parentRef),
    forwardChangeEventToParent: sendTo(
      ({ context }) => context.parentRef,
      ({ context }) => ({
        type: 'processor.change',
        id: context.processor.id,
      })
    ),
    notifyProcessorDelete: sendTo(
      ({ context }) => context.parentRef,
      ({ context }) => ({
        type: 'processor.delete',
        id: context.processor.id,
      })
    ),
  },
  guards: {
    isDraft: ({ context }) => context.isNew && !context.shouldSkipDraft,
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAcBOB7AxnW7UDoBXAO1TnQBsA3SAYgG0AGAXURXVgEsAXT9YtiAAeiAEwBmcfgBsATkkAOAIxKALEoDss2YwUAaEAE8xm-LInjVjaeIUalAVmmqAvi4NosOPEVLlqdPRKrEggyBw8fAKhIgiiEviqCjaqsgqymtq6BsYI4oxSCrpJ0oyO4g6y0m4eGNiwuAQQqACGAGbctJ71jfiwLTRMIexcvPyCsdJTZpKV4hoOOYgAtEoV+A41YXXeTa0dXTsNPpgtxNgUQ4Lho1ETiNIOqolVjPILSwhK5jJVGhrKWz2JyiLbdXb4ZrtTrg44ETAACzOMCuoRukXGMTElQ2og0lnmiyMiGSMniCjsAOcqjx1Xc2y8cPwmH4bU4UEIZAg+E4EAoYEOjN6kB4qJGGOioFiDlE0kSoiqdiJuXxCnw+NkDgUkh1szBR16LOIbI5XPwIt4xCggp6Pn6gxY1wiY0lwkQ81EZjU1lEysQmqUZg1Wt1evpsMNrPZnMg5ogkStNohp3OYEujrRzruWLyDgc+HSPr9CABsnwEk12tDFX1QpOUdNsYtnETEZ8EDTYG4YDFYSzmKliCcjAL9impVkGhpAM+IKDGlEjH+-1UTlc4YN9eN0bNzdbm-hSKtPYz4pd9wQk8+Chp5cr1bD9OI6A78DRB6dtwHbq+n2W8XEWtbQIEgyFwAIIE-CULwcDR8HEeRtEcaRFzeApi1ERwZHxSxrCBZD11qOs9mhKDzxzVR-gLUQaSUOxUm0bRVE+TD82kHCrBsOwCKA5MGxjSDMy-V1YlST5HkDCsQ2rTYN2I5l+LNXl+TI7NBxLAozHMOiPmJS9pnMDRdAfWSiOAhTt0bbk9ygVTv1iJQ5HLYtJxHIzFyrUNTIZcyO35btBLPNSfymKQ3nyJcATzGVpE+HVyzWKsF3EFC8TcNwgA */
  id: 'processor',
  context: ({ input }) => ({
    parentRef: input.parentRef,
    previousProcessor: input.processor,
    processor: input.processor,
    isNew: input.isNew ?? false,
    shouldSkipDraft: input.shouldSkipDraft ?? false,
    isUpdated: input.shouldSkipDraft ?? false,
  }),
  initial: 'unresolved',
  states: {
    unresolved: {
      always: [{ target: 'draft', guard: 'isDraft' }, { target: 'configured' }],
    },
    draft: {
      on: {
        'processor.save': {
          target: '#configured',
          actions: [{ type: 'markAsUpdated' }, { type: 'forwardEventToParent' }],
        },
        'processor.cancel': '#deleted',
        'processor.change': {
          actions: [
            { type: 'changeProcessor', params: ({ event }) => event },
            { type: 'forwardChangeEventToParent' },
          ],
        },
        'processor.changeParent': {
          actions: [{ type: 'changeParent', params: ({ event }) => event }],
        },
      },
    },
    configured: {
      id: 'configured',
      initial: 'idle',
      states: {
        idle: {
          on: {
            'processor.edit': {
              target: 'editing',
              actions: [{ type: 'forwardEventToParent' }],
            },
            'processor.changeParent': {
              actions: [{ type: 'changeParent', params: ({ event }) => event }],
            },
            // receive upstream changes
            'processor.change': {
              actions: [
                { type: 'markAsUpdated' },
                { type: 'changeProcessor', params: ({ event }) => event },
              ],
            },
            'processor.reset': {
              actions: [{ type: 'reset', params: ({ event }) => event }],
            },
          },
        },
        editing: {
          on: {
            'processor.save': {
              target: 'idle',
              actions: [{ type: 'markAsUpdated' }, { type: 'forwardEventToParent' }],
            },
            'processor.cancel': {
              target: 'idle',
              actions: [{ type: 'resetToPrevious' }, { type: 'forwardEventToParent' }],
            },
            'processor.change': {
              actions: [
                { type: 'changeProcessor', params: ({ event }) => event },
                { type: 'forwardChangeEventToParent' },
              ],
            },
            'processor.changeParent': {
              actions: [{ type: 'changeParent', params: ({ event }) => event }],
            },
            'processor.delete': '#deleted',
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
