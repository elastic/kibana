/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { MachineImplementationsFrom, assign, and, setup, ActorRefFrom, raise } from 'xstate5';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import { WiredStreamGetResponse, isSchema, routingDefinitionListSchema } from '@kbn/streams-schema';
import { isEmpty, isEqual } from 'lodash';
import {
  StreamRoutingContext,
  StreamRoutingEvent,
  StreamRoutingInput,
  StreamRoutingServiceDependencies,
} from './types';
import {
  createUpsertStreamActor,
  createStreamFailureNofitier,
  createStreamSuccessNofitier,
  createForkStreamActor,
  createDeleteStreamActor,
} from './stream_actors';
import { routingConverter } from '../../utils';
import { RoutingDefinitionWithUIAttributes } from '../../types';

export type StreamRoutingActorRef = ActorRefFrom<typeof streamRoutingMachine>;

export const streamRoutingMachine = setup({
  types: {
    input: {} as StreamRoutingInput,
    context: {} as StreamRoutingContext,
    events: {} as StreamRoutingEvent,
  },
  actors: {
    deleteStream: getPlaceholderFor(createDeleteStreamActor),
    forkStream: getPlaceholderFor(createForkStreamActor),
    upsertStream: getPlaceholderFor(createUpsertStreamActor),
  },
  actions: {
    notifyStreamSuccess: getPlaceholderFor(createStreamSuccessNofitier),
    notifyStreamFailure: getPlaceholderFor(createStreamFailureNofitier),
    refreshDefinition: () => {},
    storeDefinition: assign((_, params: { definition: WiredStreamGetResponse }) => ({
      definition: params.definition,
    })),
    reorderRouting: assign((_, params: { routing: RoutingDefinitionWithUIAttributes[] }) => ({
      routing: params.routing,
    })),
  },
  guards: {
    hasRoutingRules: (_, params: { routing: RoutingDefinitionWithUIAttributes[] }) =>
      !isEmpty(params.routing),
    hasMultipleRoutingRules: ({ context }) => context.routing.length > 1,
    hasStagedChanges: ({ context }) => !isEqual(context.initialRouting, context.routing),
    isValidRouting: ({ context }) =>
      isSchema(routingDefinitionListSchema, context.routing.map(routingConverter.toAPIDefinition)),
    canUpdateStream: and(['hasStagedChanges', 'isValidRouting']),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QCcD2BXALgSwHZQGVNkwBDAWwDo9sdSAbbALzygGIBtABgF1FQADqli1sqXPxAAPRAFoAjADYAHJXnyAzACZl8rQFYANCACeiLVsr6uGgJxdFBgL5PjaLKyIkKlbxBNssMRkVCQAxmDYAG6Q3HxIIEIiOOKSMgjatmr6jkamcvoalAAs8lzyOc6uIO44+F4hvmT+lEHeVNgQ9GCBwT4ksGCYcZJJoqkJ6bI6XJQayjp6eWYIWsX6lAvFWvLKAOz6Lm4YdYR9oc0mrefUXT1tjegCEKSYYCMJYykSk3LKqrZirYdvtlogNFxZjp9BVckcaidPDc-FcHj4ni9TmwIOIwNRcFFUABrPFPQbITANCgAQTCmFQyA+gmE4x+oHSGnWlC4Wk5GgOxhW2w2+ls-MO1VqSPaTVILTRVAxr1YbDAyDQyEoAnorwAZgzFQJyZTzrT6YzeKMWd80gVFILwcoNspFNpdFVqrhUBA4JIpfVzlbkmI2dI5HYAYouGKBfkEApSnM9mUYxLjh4AzKaHRGCx8EHWbb47s9tybPZcg744VNsno+L4f6zjKUQWbb94xprJRbFHU1WyvJKHsnbCqunTlSLnLUYHPtaQ0XZBDLL367GVrsstCx2mERnm40Udcs3c24uO9N9MUe33xVWIVDR5U902p7L5TcladzxN2eZbCHPQU3vOMtD2RRh2fOEXCcIA */
  id: 'routingStream',
  context: ({ input }) => {
    const routing = input.definition.stream.ingest.wired.routing.map(
      routingConverter.toUIDefinition
    );

    return {
      definition: input.definition,
      initialRouting: routing,
      routing,
    };
  },
  initial: 'initializing',
  states: {
    initializing: {
      always: 'ready',
    },
    ready: {
      id: 'ready',
      type: 'parallel',
      on: {
        'stream.received': {
          target: '#ready',
          actions: [{ type: 'storeDefinition', params: ({ event }) => event }],
          reenter: true,
        },
      },
      states: {
        stream: {
          initial: 'idle',
          states: {
            idle: {
              on: {
                'stream.reset': {
                  guard: 'hasStagedChanges',
                  target: '#ready',
                  reenter: true,
                },
                'stream.update': {
                  guard: 'canUpdateStream',
                  target: 'updating',
                },
              },
            },
            updating: {
              invoke: {
                id: 'upsertStreamActor',
                src: 'upsertStream',
                input: ({ context }) => ({
                  definition: context.definition,
                  routing: context.routing,
                }),
                onDone: {
                  target: 'idle',
                  actions: [{ type: 'notifyStreamSuccess' }, { type: 'refreshDefinition' }],
                },
                onError: {
                  target: 'idle',
                  actions: [{ type: 'notifyStreamFailure' }],
                },
              },
            },
          },
        },
        routing: {
          type: 'parallel',
          states: {
            displayingRoutingRules: {
              id: 'displayingRoutingRules',
              initial: 'idle',
              on: {
                'routingRule.update': {
                  guard: {
                    type: 'hasRoutingRules',
                    params: ({ context }) => ({ routing: context.routing }),
                  },
                  target: 'displayingRoutingRules.updatingRule',
                },
              },
              states: {
                idle: {
                  on: {
                    'routingRule.reorder': {
                      guard: 'hasMultipleRoutingRules',
                      actions: [{ type: 'reorderRouting', params: ({ event }) => event }],
                    },
                    'routingRule.create': 'creatingNewRule',
                    'routingRule.save': {
                      guard: 'hasStagedChanges',
                      target: 'idle',
                      actions: [raise({ type: 'stream.update' })],
                    },
                  },
                },
                creatingNewRule: {
                  on: {
                    'routingRule.cancel': {
                      target: 'idle',
                      actions: [{ type: 'cancelRuleChanges' }],
                    },
                    'routingRule.change': {
                      actions: [{ type: 'storeRule', params: ({ event }) => event }],
                    },
                    'routingRule.save': {
                      target: 'idle',
                      actions: [raise({ type: 'stream.update' })],
                    },
                  },
                },
                updatingRule: {
                  on: {
                    'routingRule.cancel': {
                      target: 'idle',
                      actions: [{ type: 'cancelRuleChanges' }],
                    },
                    'routingRule.change': {
                      actions: [{ type: 'storeRule', params: ({ event }) => event }],
                    },
                    'routingRule.remove': 'removingRule',
                    'routingRule.save': {
                      target: 'idle',
                      actions: [raise({ type: 'stream.update' })],
                    },
                  },
                },
                removingRule: {},
              },
            },
            displayingDataPreview: {
              states: {
                idle: {},
                noData: {},
              },
            },
          },
        },
      },
    },
  },
});

export const createStreamRoutingMachineImplementations = ({
  refreshDefinition,
  streamsRepositoryClient,
  core,
}: StreamRoutingServiceDependencies): MachineImplementationsFrom<typeof streamRoutingMachine> => ({
  actors: {
    deleteStream: createDeleteStreamActor({ streamsRepositoryClient }),
    forkStream: createForkStreamActor({ streamsRepositoryClient }),
    upsertStream: createUpsertStreamActor({ streamsRepositoryClient }),
  },
  actions: {
    refreshDefinition,
    notifyStreamSuccess: createStreamSuccessNofitier({
      toasts: core.notifications.toasts,
    }),
    notifyStreamFailure: createStreamFailureNofitier({
      toasts: core.notifications.toasts,
    }),
  },
});
