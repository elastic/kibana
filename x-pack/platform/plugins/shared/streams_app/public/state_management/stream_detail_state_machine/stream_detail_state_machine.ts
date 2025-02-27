/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { MachineImplementationsFrom, assign, enqueueActions, setup } from 'xstate5';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import {
  StreamGetResponse,
  isUnwiredStreamGetResponse,
  isWiredStreamGetResponse,
} from '@kbn/streams-schema';
import { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import { createLoadDefinitionActor } from './load_definition_actor';
import { StreamDetailContext, StreamDetailEvent, StreamDetailInput } from './types';

export const streamDetailMachine = setup({
  types: {
    input: {} as StreamDetailInput,
    context: {} as StreamDetailContext,
    events: {} as StreamDetailEvent,
  },
  actors: {
    loadDefinition: getPlaceholderFor(createLoadDefinitionActor),
  },
  actions: {
    storeDefinition: enqueueActions(
      ({ enqueue }, { definition }: { definition: StreamGetResponse }) => {
        if (isWiredStreamGetResponse(definition) || isUnwiredStreamGetResponse(definition)) {
          return enqueue.assign({ definition });
        }

        throw new Error('Stream detail only supports IngestStreams.');
      }
    ),
  },
  guards: {
    shouldReloadDefinition: ({ context }, params: { name: string }) => {
      return context.name !== params.name;
    },
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5SwC4CcwEMC2ARMKmAlgDYB0ArgHZE0pGYlEBekAxANoAMAuoqAAcA9rCL0hVfiAAeiAEwB2AGxklATgCMAFi5K5AVgA0IAJ7yAzFrJct23Qa6PHcgL4vjqDDnyFSZWmIMTKwQbBBgAGYB4lSUAhCYKGAAcjhg3HxIIMKiMVKyCBpyVvoKWnJclppyGlxqWsZmCOb1ZMo6evpuHuhYeATE5NFBLJD+ECRgYZHDEmQYJEKYEBlSOYES+YgAtLUKqloAHFr6ivqHCodquo2ISspkagoa5vq2Sh8fCt0gnn0+g38dBGITIi2WtCg+CiwIkYQkYCBADchABrRHgiCQ6GzKgAQQAxighGhVll1nksgV9PprFolFcuAYLoylLcEB85I9zK81OYFF13L9et4Bn5hoxRhAwUssVQoTNYVQ2GA0GgSWQBCREhESdgZRD5TilYTiaTeGsRBtJFTEOYuIcyFdjqcBSzrmzTHc9NzefzBT0vP1fENgZLQeEYdaADKygBig3Ykdx8zAmLJgitlNA1IFZDkSn0Sh0zMumnZ9xUTxebw0ny+biFVCE4XgWT+opDltyRE2toQ2wq5gOLrO7puXoQhxUjkuRQDwqDAL81AlwUg3etWwQDidckO8-ZGgUw-0XDnBh+HeDgLXUs32ZkOw0NJHJzHZYnTXt+wLHUvQrXsuoaBOGYxEBMYAPr2No5jsSgaNYTgvqWrLsgK+xlA6hy1vW3yASKN7imG67Spi2KKlu5JZjB27aMOJ5aJYWhHMUNSHIc7JvLSPJDvOV6EcBQKgaRZDJkqsbLAmpAbtRPZ9nBCBFlyhZyLyjjuho6FaGo1hqMUWgKJoeGNi4QA */
  id: 'streamDetail',
  context: ({ input }) => ({
    name: input.name,
    error: null,
  }),
  initial: 'uninitialized',
  states: {
    uninitialized: {
      always: 'initialized', // Placeholder for future initialization logic
    },
    initialized: {
      initial: 'loadingDefinition',
      on: {
        'definition.updateName': {
          guard: { type: 'shouldReloadDefinition', params: ({ event }) => ({ name: event.name }) },
          target: '.loadingDefinition',
          actions: assign(({ event }) => ({ name: event.name })),
        },
      },
      states: {
        idle: {
          on: {
            'definition.reload': 'loadingDefinition',
          },
        },
        loadingDefinition: {
          invoke: {
            id: 'loadingDefinitionActor',
            src: 'loadDefinition',
            input: ({ context }) => ({
              name: context.name,
            }),
            onDone: {
              target: 'idle',
              actions: [
                { type: 'storeDefinition', params: ({ event }) => ({ definition: event.output }) },
              ],
            },
            onError: {
              target: 'definitionLoadFailed',
              actions: assign(({ event }) => ({ error: event.error as Error })),
            },
          },
        },
        definitionLoadFailed: {
          exit: assign({ error: null }),
          on: {
            'definition.reload': 'loadingDefinition',
          },
        },
      },
    },
  },
});

export const createStreamDetailMachineImplementations = ({
  streamsRepositoryClient,
}: {
  streamsRepositoryClient: StreamsRepositoryClient;
}): MachineImplementationsFrom<typeof streamDetailMachine> => ({
  actors: {
    loadDefinition: createLoadDefinitionActor({ streamsRepositoryClient }),
  },
});
