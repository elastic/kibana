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
  /** @xstate-layout N4IgpgJg5mDOIC5SwC4CcwEMC2ARMKmAlgDYB0ArgHZE0pGYlEBekAxANoAMAuoqAAcA9rCL0hVfiAAeiAIwB2BWQCcCgMyKAHACYALOr0BWHSoBsAGhABPRPp1l1RoytNyzc53r0qAvr6tUDBx8QlIyWjEGJlYINggwADNI8SpKAQhMFDAAORwwbj4kEGFRVKlZBDktOVVzLhUuLgUzLXUuM3UrWwRvLjJmnTNm9TaWhS49f0D0LDwCYnIU6JZICIgSMHik5YkyDBIhTAhCqVKoiQrELQUtAc8jTqMNI3VW7sQjPX6zMwU1UzNAxOaYgIJzUKLCJ0FaxMiHY60KD4ZIwiTxCRgaEANyEAGsseCQgtwstGKsIPCjhAkSjdlQELRcQBjLJECSFU7Fc7lYqVMx6ZRaFRtGreFRyb56D4IYZ6VSvSU1XQqVVmUFE+ZhJYw8lwhE0qjInZoqhsMBoNBCNBkAQkLKJa3YMiayGk3UxNYG2kmi4MplCVmpTm8M4iP1XWVfMg3HyjZ5ON5aGXGBwdHRGOTVBpcR5aDWzYna6FRPVrBKov0AGWpADFFuwK-T9mADVzBOHeaB+dGdB01JnVZLJjLRrVgUYtGZXoZGgp-AEQFQhAl4MVXSSSGGyuzJHzrkY6sNGs1Wu1OqP5Xp9DUFM5E5mQYuN8XqGTPRBtxH91UTGQ5A0wqGIoIp6H8MpyDotSuHot73q8mZTM+hZalC74Ul+XYyPI6jqEeOanm0HRdDYdgqHh5FOFOM4+M0BbBKh7qlh+6ybJhu6RjBZC-N8XAAS8SYyh4Kj-poeZaJMKhGA09EQpuJb0GWlLekadKmuxlw-t8ZhkMY7Q3BJ1QAcYMrPIeSj1LhejuC0slFmhHoUmQTamjWxz1qQkAaXu3aII0tRNEoDSdB0rSWKRCCjHhpgGHxniCmBfgLkAA */
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
