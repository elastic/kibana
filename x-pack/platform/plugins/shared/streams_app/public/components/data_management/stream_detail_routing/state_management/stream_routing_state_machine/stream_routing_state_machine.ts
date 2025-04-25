/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { MachineImplementationsFrom, assign, and, setup, ActorRefFrom } from 'xstate5';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import { WiredStreamGetResponse, isSchema, routingDefinitionListSchema } from '@kbn/streams-schema';
import { ALWAYS_CONDITION } from '../../../../../util/condition';
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
import { selectCurrentRule } from './selectors';

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
    addNewRoutingRule: assign(({ context }) => {
      const newRule = routingConverter.toUIDefinition({
        destination: `${context.definition.stream.name}.child`,
        if: ALWAYS_CONDITION,
        isNew: true,
      });

      return {
        currentRuleId: newRule.id,
        routing: [...context.routing, newRule],
      };
    }),
    patchRule: assign(
      ({ context }, params: { routingRule: Partial<RoutingDefinitionWithUIAttributes> }) => ({
        routing: context.routing.map((rule) =>
          rule.id === context.currentRuleId ? { ...rule, ...params.routingRule } : rule
        ),
      })
    ),
    reorderRouting: assign((_, params: { routing: RoutingDefinitionWithUIAttributes[] }) => ({
      routing: params.routing,
    })),
    resetRoutingChanges: assign(({ context }) => ({
      currentRuleId: null,
      routing: context.initialRouting,
    })),
    setupRouting: assign((_, params: { definition: WiredStreamGetResponse }) => {
      const routing = params.definition.stream.ingest.wired.routing.map(
        routingConverter.toUIDefinition
      );

      return {
        currentRuleId: null,
        initialRouting: routing,
        routing,
      };
    }),
    storeCurrentRuleId: assign((_, params: { id: StreamRoutingContext['currentRuleId'] }) => ({
      currentRuleId: params.id,
    })),
    storeDefinition: assign((_, params: { definition: WiredStreamGetResponse }) => ({
      definition: params.definition,
    })),
  },
  guards: {
    canForkStream: and(['hasManagePrivileges', 'isValidRouting']),
    canReorderRules: and(['hasManagePrivileges', 'hasMultipleRoutingRules']),
    canUpdateStream: and(['hasManagePrivileges', 'isValidRouting']),
    hasMultipleRoutingRules: ({ context }) => context.routing.length > 1,
    hasManagePrivileges: ({ context }) => context.definition.privileges.manage,
    hasSimulatePrivileges: ({ context }) => context.definition.privileges.simulate,
    isAlreadyEditing: ({ context }, params: { id: string }) => context.currentRuleId === params.id,
    isValidRouting: ({ context }) =>
      isSchema(routingDefinitionListSchema, context.routing.map(routingConverter.toAPIDefinition)),
  },
}).createMachine({
  /** @xstate-layout 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-LIEVFIWhUgAUy7V0r-xQEAnREysKFVvMKDNKMqrvDqtkuzRAoVlA6FIazVQ0oDBsuFtMG1k9DBeW0GUTwmZJLSOqgrbyNJTiJifApdNkdW4A1YFmrBupRxOrZjqbQNiFrXFUriHQU1Lz9hrQfCWYB27m0beJGaZLpTNV6FoNwqpvi2CzDSde3RQo-CNeo7aBMM1VOgeOkNxKw3aBaBUKNhbMS-xXq4d660rHGD6Fu2ZO7xk+ICfkidtNLyK3PeSNECZJIyNlF5RwWYcG4qdWyiZeTnR6PfZM61R6uWSm+FrZGsoqQFucCjRAjqolfAuOWhwmToMIdg9yApx8im6TiF+pV-S81eCuLKCh6tgr7OeH2EcgCKhZhuT4IAA */
  id: 'routingStream',
  context: ({ input }) => ({
    currentRuleId: null,
    definition: input.definition,
    initialRouting: [],
    routing: [],
  }),
  initial: 'initializing',
  states: {
    initializing: {
      always: 'ready',
    },
    ready: {
      id: 'ready',
      initial: 'idle',
      entry: [
        { type: 'setupRouting', params: ({ context }) => ({ definition: context.definition }) },
      ],
      on: {
        'stream.received': {
          target: '#ready',
          actions: [{ type: 'storeDefinition', params: ({ event }) => event }],
          reenter: true,
        },
      },
      states: {
        idle: {
          id: 'idle',
          on: {
            'routingRule.create': {
              guard: 'hasSimulatePrivileges',
              target: 'creatingNewRule',
            },
            'routingRule.edit': {
              guard: 'hasManagePrivileges',
              target: 'editingRule',
              actions: [{ type: 'storeCurrentRuleId', params: ({ event }) => event }],
            },
            'routingRule.reorder': {
              guard: 'canReorderRules',
              target: 'reorderingRules',
              actions: [{ type: 'reorderRouting', params: ({ event }) => event }],
            },
          },
        },
        creatingNewRule: {
          id: 'creatingNewRule',
          entry: [{ type: 'addNewRoutingRule' }],
          exit: [{ type: 'resetRoutingChanges' }],
          initial: 'changing',
          states: {
            changing: {
              on: {
                'routingRule.cancel': {
                  target: '#idle',
                  actions: [{ type: 'resetRoutingChanges' }],
                },
                'routingRule.change': {
                  actions: [{ type: 'patchRule', params: ({ event }) => event }],
                },
                'routingRule.edit': {
                  guard: 'hasManagePrivileges',
                  target: '#editingRule',
                  actions: [{ type: 'storeCurrentRuleId', params: ({ event }) => event }],
                },
                'routingRule.fork': {
                  guard: 'canForkStream',
                  target: 'forking',
                },
              },
            },
            forking: {
              invoke: {
                id: 'forkStreamActor',
                src: 'forkStream',
                input: ({ context }) => {
                  const currentRoutingRule = selectCurrentRule(context);

                  return {
                    definition: context.definition,
                    if: currentRoutingRule.if,
                    destination: currentRoutingRule.destination,
                  };
                },
                onDone: {
                  target: '#idle',
                  actions: [{ type: 'refreshDefinition' }],
                },
                onError: {
                  target: 'changing',
                  actions: [{ type: 'notifyStreamFailure' }],
                },
              },
            },
          },
        },
        editingRule: {
          id: 'editingRule',
          initial: 'changing',
          exit: [{ type: 'resetRoutingChanges' }],
          states: {
            changing: {
              on: {
                'routingRule.create': {
                  guard: 'hasSimulatePrivileges',
                  target: '#creatingNewRule',
                },
                'routingRule.cancel': {
                  target: '#idle',
                  actions: [{ type: 'resetRoutingChanges' }],
                },
                'routingRule.change': {
                  actions: [{ type: 'patchRule', params: ({ event }) => event }],
                },
                'routingRule.edit': [
                  {
                    guard: { type: 'isAlreadyEditing', params: ({ event }) => event },
                    target: '#idle',
                    actions: [{ type: 'storeCurrentRuleId', params: { id: null } }],
                  },
                  {
                    actions: [{ type: 'storeCurrentRuleId', params: ({ event }) => event }],
                  },
                ],
                'routingRule.remove': {
                  guard: 'hasManagePrivileges',
                  target: 'removingRule',
                },
                'routingRule.save': {
                  guard: 'canUpdateStream',
                  target: 'updatingRule',
                },
              },
            },
            removingRule: {
              invoke: {
                id: 'deleteStreamActor',
                src: 'deleteStream',
                input: ({ context }) => ({
                  name: selectCurrentRule(context).destination,
                }),
                onDone: {
                  target: '#idle',
                  actions: [{ type: 'refreshDefinition' }],
                },
                onError: {
                  target: 'changing',
                },
              },
            },
            updatingRule: {
              invoke: {
                id: 'upsertStreamActor',
                src: 'upsertStream',
                input: ({ context }) => ({
                  definition: context.definition,
                  routing: context.routing.map(routingConverter.toAPIDefinition),
                }),
                onDone: {
                  target: '#idle',
                  actions: [{ type: 'notifyStreamSuccess' }, { type: 'refreshDefinition' }],
                },
                onError: {
                  target: 'changing',
                  actions: [{ type: 'notifyStreamFailure' }],
                },
              },
            },
          },
        },
        reorderingRules: {
          id: 'reorderingRules',
          initial: 'reordering',
          states: {
            reordering: {
              on: {
                'routingRule.reorder': {
                  actions: [{ type: 'reorderRouting', params: ({ event }) => event }],
                },
                'routingRule.cancel': {
                  target: '#idle',
                  actions: [{ type: 'resetRoutingChanges' }],
                },
                'routingRule.save': {
                  guard: 'canUpdateStream',
                  target: 'updatingStream',
                },
              },
            },
            updatingStream: {
              invoke: {
                id: 'upsertStreamActor',
                src: 'upsertStream',
                input: ({ context }) => ({
                  definition: context.definition,
                  routing: context.routing.map(routingConverter.toAPIDefinition),
                }),
                onDone: {
                  target: '#idle',
                  actions: [{ type: 'notifyStreamSuccess' }, { type: 'refreshDefinition' }],
                },
                onError: {
                  target: 'reordering',
                  actions: [{ type: 'notifyStreamFailure' }],
                },
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
  forkSuccessNofitier,
}: StreamRoutingServiceDependencies): MachineImplementationsFrom<typeof streamRoutingMachine> => ({
  actors: {
    deleteStream: createDeleteStreamActor({ streamsRepositoryClient }),
    forkStream: createForkStreamActor({ streamsRepositoryClient, forkSuccessNofitier }),
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
