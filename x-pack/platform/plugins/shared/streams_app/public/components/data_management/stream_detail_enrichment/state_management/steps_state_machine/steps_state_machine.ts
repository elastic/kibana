/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ActorRefFrom, SnapshotFrom } from 'xstate5';
import { assign, forwardTo, sendTo, setup } from 'xstate5';
import type {
  StreamlangProcessorDefinition,
  StreamlangWhereBlockWithUIAttributes,
} from '@kbn/streamlang';
import type { ProcessorResources, StepContext, StepEvent, StepInput } from './types';

export type StepActorRef = ActorRefFrom<typeof stepMachine>;
export type StepActorSnapshot = SnapshotFrom<typeof stepMachine>;

export const stepMachine = setup({
  types: {
    input: {} as StepInput,
    context: {} as StepContext,
    events: {} as StepEvent,
  },
  actions: {
    changeProcessor: assign(
      (
        { context },
        params: {
          step: StreamlangProcessorDefinition;
          resources?: ProcessorResources;
        }
      ) => {
        return {
          step: {
            ...params.step,
            customIdentifier: context.step.customIdentifier,
            parentId: context.step.parentId,
          },
          resources: params.resources,
        };
      }
    ),
    changeCondition: assign(
      (
        { context },
        params: {
          step: StreamlangWhereBlockWithUIAttributes;
        }
      ) => {
        return {
          step: {
            ...params.step,
            customIdentifier: context.step.customIdentifier,
          },
        };
      }
    ),
    resetToPrevious: assign(({ context }) => ({
      step: context.previousStep,
    })),
    markAsUpdated: assign(({ context }) => ({
      previousStep: context.step,
      isUpdated: true,
    })),
    forwardEventToParent: forwardTo(({ context }) => context.parentRef),
    forwardChangeEventToParent: sendTo(
      ({ context }) => context.parentRef,
      ({ context }) => ({
        type: 'step.change',
        id: context.step.customIdentifier,
      })
    ),
    notifyStepDelete: sendTo(
      ({ context }) => context.parentRef,
      ({ context }) => ({
        type: 'step.delete',
        id: context.step.customIdentifier,
      })
    ),
  },
  guards: {
    isDraft: ({ context }) => context.isNew,
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAcBOB7AxnW7UDoBXAO1TnQBsA3SAYgG0AGAXURXVgEsAXT9YtiAAeiAEwBmcfgBsATkkAOAIxKALEoDss2YwUAaEAE8xm-LInjVjaeIUalAVmmqAvi4NosOPEVLlqdPRKrEggyBw8fAKhIgiiEviqCjaqsgqymtq6BsYI4oxSCrpJ0oyO4g6y0m4eGNiwuAQQqACGAGbctJ71jfiwLTRMIexcvPyCsdJTZpKV4hoOOYgAtEoV+A41YXXeTa0dXTsNPpgtxNgUQ4Lho1ETiNIOqolVjPILSwhK5jJVGhrKWz2JyiLbdXb4ZrtTrg44ETAACzOMCuoRukXGMTElQ2og0lnmiyMiGSMniCjsAOcqjx1Xc2y8cPwmH4bU4UEIZAg+E4EAoYEOjN6kB4qJGGOioFiDlE0kSoiqdiJuXxCnw+NkDgUkh1szBR16LOIbI5XPwIt4xCggp6Pn6gxY1wiY0lwkQ81EZjU1lEysQmqUZg1Wt1evpsMNrPZnMg5ogkStNohp3OYEujrRzruWLyDgc+HSPr9CABsnwEk12tDFX1QpOUdNsYtnETEZ8EDTYG4YDFYSzmKliCcjAL9impVkGhpAM+IKDGlEjH+-1UTlc4YN9eN0bNzdbm-hSKtPYz4pd9wQk8+Chp5cr1bD9OI6A78DRB6dtwHbq+n2W8XEWtbQIEgyFwAIIE-CULwcDR8HEeRtEcaRFzeApi1ERwZHxSxrCBZD11qOs9mhKDzxzVR-gLUQaSUOxUm0bRVE+TD82kHCrBsOwCKA5MGxjSDMy-V1YlST5HkDCsQ2rTYN2I5l+LNXl+TI7NBxLAozHMOiPmJS9pnMDRdAfWSiOAhTt0bbk9ygVTv1iJQ5HLYtJxHIzFyrUNTIZcyO35btBLPNSfymKQ3nyJcATzGVpE+HVyzWKsF3EFC8TcNwgA */
  id: 'processor',
  context: ({ input }) => ({
    parentRef: input.parentRef,
    previousStep: input.step,
    step: input.step,
    isNew: input.isNew ?? false,
  }),
  initial: 'unresolved',
  states: {
    unresolved: {
      always: [{ target: 'draft', guard: 'isDraft' }, { target: 'configured' }],
    },
    draft: {
      on: {
        'step.save': {
          target: '#configured',
          actions: [{ type: 'markAsUpdated' }, { type: 'forwardEventToParent' }],
        },
        'step.cancel': '#deleted',
        'step.changeProcessor': {
          actions: [
            { type: 'changeProcessor', params: ({ event }) => event },
            { type: 'forwardChangeEventToParent' },
          ],
        },
        'step.changeCondition': {
          actions: [
            { type: 'changeCondition', params: ({ event }) => event },
            { type: 'forwardChangeEventToParent' },
          ],
        },
      },
    },
    configured: {
      id: 'configured',
      initial: 'idle',
      states: {
        idle: {
          on: {
            'step.edit': {
              target: 'editing',
              actions: [{ type: 'forwardEventToParent' }],
            },
            'step.delete': '#deleted',
          },
        },
        editing: {
          on: {
            'step.save': {
              target: 'idle',
              actions: [{ type: 'markAsUpdated' }, { type: 'forwardEventToParent' }],
            },
            'step.cancel': {
              target: 'idle',
              actions: [{ type: 'resetToPrevious' }, { type: 'forwardEventToParent' }],
            },
            'step.changeProcessor': {
              actions: [
                { type: 'changeProcessor', params: ({ event }) => event },
                { type: 'forwardChangeEventToParent' },
              ],
            },
            'step.changeCondition': {
              actions: [
                { type: 'changeCondition', params: ({ event }) => event },
                { type: 'forwardChangeEventToParent' },
              ],
            },

            'step.delete': '#deleted',
          },
        },
      },
    },
    deleted: {
      id: 'deleted',
      type: 'final',
      entry: [{ type: 'notifyStepDelete' }],
    },
  },
});
