/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ActorRefFrom, SnapshotFrom } from 'xstate';
import { and, assign, forwardTo, sendTo, setup } from 'xstate';
import type {
  StreamlangProcessorDefinition,
  StreamlangStepWithUIAttributes,
  StreamlangConditionBlockWithUIAttributes,
} from '@kbn/streamlang';
import { isActionBlock } from '@kbn/streamlang';
import type { StepContext, StepEvent, StepInput } from './types';

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
        }
      ) => {
        const nextStep: StreamlangStepWithUIAttributes = {
          ...params.step,
          customIdentifier: context.step.customIdentifier,
          parentId: context.step.parentId,
        };

        return {
          step: nextStep,
        };
      }
    ),
    changeCondition: assign(
      (
        { context },
        params: {
          step: StreamlangConditionBlockWithUIAttributes;
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
    changeDescription: assign(({ context }, { description }: { description?: string }) => {
      if (!isActionBlock(context.step)) {
        return {};
      }

      const trimmedDescription = description?.trim();
      const updatedStep = {
        ...context.step,
        description: trimmedDescription || undefined,
      };

      return {
        step: updatedStep,
        previousStep: updatedStep,
        isUpdated: true,
      };
    }),
    changeParent: assign(({ context }, { parentId }: { parentId: string | null }) => {
      const updatedStep = {
        ...context.step,
        parentId,
      };

      return {
        step: updatedStep,
        previousStep: updatedStep,
        isUpdated: true,
      };
    }),
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
    forwardParentChangeEventToParent: sendTo(
      ({ context }) => context.parentRef,
      ({ context }) => ({
        type: 'step.parentChanged',
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
    updateGrokPatternDefinitions: ({ context }) => {
      const step = context.step;
      // Only update if it's a grok processor with pattern definitions
      if (
        isActionBlock(step) &&
        step.action === 'grok' &&
        step.pattern_definitions &&
        typeof step.pattern_definitions === 'object'
      ) {
        context.grokCollection.setCustomPatterns(step.pattern_definitions);
      } else {
        // Clear custom patterns if it's not a grok processor or has no definitions
        context.grokCollection.setCustomPatterns({});
      }
    },
    clearGrokPatternDefinitions: ({ context }) => {
      context.grokCollection.setCustomPatterns({});
    },
  },
  guards: {
    isDraft: ({ context }) => context.isNew && !context.isUpdated,
    isUpdated: ({ context }) => context.isUpdated === true,
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAcBOB7AxnW7UDoBXAO1TnQBsA3SAYgG0AGAXURXVgEsAXT9YtiAAeiAEwBmcfgBsATkkAOAIxKALEoDss2YwUAaEAE8xm-LInjVjaeIUalAVmmqAvi4NosOPEVLlqdPRKrEggyBw8fAKhIgiiEviqCjaqsgqymtq6BsYI4oxSCrpJ0oyO4g6y0m4eGNiwuAQQqACGAGbctJ71jfiwLTRMIexcvPyCsdJTZpKV4hoOOYgAtEoV+A41YXXeTa0dXTsNPpgtxNgUQ4Lho1ETiNIOqolVjPILSwhK5jJVGhrKWz2JyiLbdXb4ZrtTrg44ETAACzOMCuoRukXGMTElQ2og0lnmiyMiGSMniCjsAOcqjx1Xc2y8cPwmH4bU4UEIZAg+E4EAoYEOjN6kB4qJGGOioFiDlE0kSoiqdiJuXxCnw+NkDgUkh1szBR16LOIbI5XPwIt4xCggp6Pn6gxY1wiY0lwkQ81EZjU1lEysQmqUZg1Wt1evpsMNrPZnMg5ogkStNohp3OYEujrRzruWLyDgc+HSPr9CABsnwEk12tDFX1QpOUdNsYtnETEZ8EDTYG4YDFYSzmKliCcjAL9impVkGhpAM+IKDGlEjH+-1UTlc4YN9eN0bNzdbm-hSKtPYz4pd9wQk8+Chp5cr1bD9OI6A78DRB6dtwHbq+n2W8XEWtbQIEgyFwAIIE-CULwcDR8HEeRtEcaRFzeApi1ERwZHxSxrCBZD11qOs9mhKDzxzVR-gLUQaSUOxUm0bRVE+TD82kHCrBsOwCKA5MGxjSDMy-V1YlST5HkDCsQ2rTYN2I5l+LNXl+TI7NBxLAozHMOiPmJS9pnMDRdAfWSiOAhTt0bbk9ygVTv1iJQ5HLYtJxHIzFyrUNTIZcyO35btBLPNSfymKQ3nyJcATzGVpE+HVyzWKsF3EFC8TcNwgA */
  id: 'processor',
  context: ({ input }) => ({
    parentRef: input.parentRef,
    previousStep: input.step,
    step: input.step,
    isNew: input.isNew ?? false,
    isUpdated: input.isUpdated ?? false,
    grokCollection: input.grokCollection,
  }),
  initial: 'unresolved',
  states: {
    unresolved: {
      always: [
        // Steps that have been preconfigured in a different mode, but not persisted yet.
        { target: 'configured', guard: and(['isDraft', 'isUpdated']) },
        // Brand new in this mode
        { target: 'draft', guard: 'isDraft' },
        // Existing configured step
        { target: 'configured' },
      ],
    },
    draft: {
      entry: ['updateGrokPatternDefinitions'],
      exit: ['clearGrokPatternDefinitions'],
      on: {
        'step.save': {
          target: '#configured',
          actions: [{ type: 'markAsUpdated' }, { type: 'forwardEventToParent' }],
        },
        'step.cancel': '#deleted',
        'step.changeProcessor': {
          actions: [
            { type: 'changeProcessor', params: ({ event }) => event },
            { type: 'updateGrokPatternDefinitions' },
            { type: 'forwardChangeEventToParent' },
          ],
        },
        'step.changeCondition': {
          actions: [
            { type: 'changeCondition', params: ({ event }) => event },
            { type: 'forwardChangeEventToParent' },
          ],
        },
        'step.changeDescription': {
          actions: [
            { type: 'changeDescription', params: ({ event }) => event },
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
            'step.changeDescription': {
              actions: [
                { type: 'changeDescription', params: ({ event }) => event },
                { type: 'forwardChangeEventToParent' },
              ],
            },
            'step.changeParent': {
              actions: [
                { type: 'changeParent', params: ({ event }) => event },
                { type: 'forwardParentChangeEventToParent' },
              ],
            },
            'step.delete': '#deleted',
          },
        },
        editing: {
          entry: ['updateGrokPatternDefinitions'],
          exit: ['clearGrokPatternDefinitions'],
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
                { type: 'updateGrokPatternDefinitions' },
                { type: 'forwardChangeEventToParent' },
              ],
            },
            'step.changeCondition': {
              actions: [
                { type: 'changeCondition', params: ({ event }) => event },
                { type: 'forwardChangeEventToParent' },
              ],
            },
            'step.changeDescription': {
              actions: [
                { type: 'changeDescription', params: ({ event }) => event },
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
