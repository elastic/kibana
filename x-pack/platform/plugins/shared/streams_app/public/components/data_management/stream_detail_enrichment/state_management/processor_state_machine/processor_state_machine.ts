/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ActorRefFrom, assign, emit, forwardTo, sendTo, setup } from 'xstate5';
import { isEqual } from 'lodash';
import { ProcessorDefinition, getProcessorType } from '@kbn/streams-schema';
import {
  ProcessorInput,
  ProcessorContext,
  ProcessorEvent,
  ProcessorEmittedEvent,
  ProcessorResources,
} from './types';

export type ProcessorActorRef = ActorRefFrom<typeof processorMachine>;

export const processorMachine = setup({
  types: {
    input: {} as ProcessorInput,
    context: {} as ProcessorContext,
    events: {} as ProcessorEvent,
    emitted: {} as ProcessorEmittedEvent,
  },
  actions: {
    changeProcessor: assign(
      ({ context }, params: { processor: ProcessorDefinition; resources?: ProcessorResources }) => {
        const type = getProcessorType(params.processor);

        return {
          processor: {
            id: context.processor.id,
            type,
            ...params.processor,
          },
          resources: params.resources,
        };
      }
    ),
    resetToPrevious: assign(({ context }) => ({
      processor: context.previousProcessor,
    })),
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
    emitChangesDiscarded: emit({ type: 'processor.changesDiscarded' }),
  },
  guards: {
    isDraft: ({ context }) => context.isNew,
    hasEditingChanges: ({ context }) => !isEqual(context.previousProcessor, context.processor),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAcBOB7AxnW7UDoBXAO1TnQBsA3SAYgG0AGAXURXVgEsAXT9YtiAAeiAMz4AbACYJAFgDsATkWN5jCfNETRUgDQgAnogCM8gBz4ArMbOjjsxossalAX1f60WHHiKly1HT0xqxIIMgcPHwCYSIIUrKW+IxSlimpEtrOorL6RgimFta2jLLKMlJSivLunhjYsLgEEKgAhgBm3PiQUcRQtF4NTfiw3K0wTKHsXLz8gnGVsviilopmxpWMxnYSeYiJ4hLV8kpSovLGpme14fU+zW2d3RC9-YP3+JitxNgUk4IRGbReaIRT4RSVUTrMpmI7yByWPYICSlfC2RSiHSMSzyKo1Dy3byNXwtDpdHq8PoDO7EgiYAAW3wmLABkVmMVAcQAtNtGOC7NYqpYpIxHCckVolkdZMZnBoUvJLGZLDd3rTPvx2pwoIQyBB8JwIBQwNSicMKf8woConNYohpBJwZopOszGZZEdFMYJal8IqUplTMUpMZVTThphNdrdZBnjw45S3uHfIRkBBWtwwJbpjaOcJ7VDwcYvfI5KkVhIzEiDpJjqdzpdcWGzb5I8QtTq9QmE5wqWqI99ftnwmzgXaEG7HbI7FD7NKId7DIgqnydJZrKVKhJ7GZm0NW1HO7GKT2+8nmmBjZnh9b2SCEJjjH715iZVpMW6kfC+TJZZdjJWZSKHuHxth2Mb6ieFK9kmLZ0oyfRZiyVqjranKIGYLr4KkLpmBiphQkcSJmFsfpKE4UjmCKGLuASxDoBAcAAuerJAmh+YIFylQWIksJQgotjGIwUJfksEJbDkKzFriOQgeqJBkLggQQKxub3jyJH4Lx2juuYdjCVWS4FBcyQqCGIYnMoSoqgS-Yko83CqXe448uY-J-kKIpivISKUfI+DFjKsjTmUlarHJwykk80F9E5Y7ocifKyBUiruvpsi2NWKgBWkbprKIGLSFIEUHu20Z6nF7FxDiFjVDorrup6i75ABUhaSKc4aBklQ2XUcEamVR76oaxqVXmcQnEkthKMKUINuKRkJGC4n2KoZhqMlmIlXSh4QQmY33pkYJaC6Xp4phOhIhIwp+tulgrDIWyndtA3gV2UEvImB3jhc-knXhGzVBdehGd+2F3f+gHKC9jFXpA30JVyFi2GkKzVPd8JQiD+S4kkXp4dkQmlIktGuEAA */
  id: 'processor',
  context: ({ input }) => ({
    parentRef: input.parentRef,
    previousProcessor: input.processor,
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
              actions: [{ type: 'markAsUpdated' }, { type: 'forwardEventToParent' }],
            },
            'processor.cancel': {
              target: '#deleted',
              actions: [{ type: 'resetToPrevious' }],
            },
            'processor.change': {
              actions: [
                { type: 'changeProcessor', params: ({ event }) => event },
                { type: 'forwardChangeEventToParent' },
              ],
            },
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
                  actions: [{ type: 'markAsUpdated' }, { type: 'forwardEventToParent' }],
                },
                'processor.cancel': {
                  target: '#configured.idle',
                  actions: [
                    { type: 'emitChangesDiscarded' },
                    { type: 'resetToPrevious' },
                    { type: 'forwardEventToParent' },
                  ],
                },
                'processor.delete': '#deleted',
                'processor.change': {
                  actions: [
                    { type: 'changeProcessor', params: ({ event }) => event },
                    { type: 'forwardChangeEventToParent' },
                  ],
                },
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
