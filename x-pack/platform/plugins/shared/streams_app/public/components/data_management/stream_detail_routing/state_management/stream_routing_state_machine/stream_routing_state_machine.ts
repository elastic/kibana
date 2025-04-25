/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  MachineImplementationsFrom,
  assign,
  and,
  not,
  setup,
  ActorRefFrom,
  stateIn,
} from 'xstate5';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import { WiredStreamGetResponse, isSchema, routingDefinitionListSchema } from '@kbn/streams-schema';
import { isEmpty } from 'lodash';
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
    storeRule: assign(
      ({ context }, params: { routingRule: Partial<RoutingDefinitionWithUIAttributes> }) => ({
        routing: context.routing.map((rule) =>
          rule.id === context.currentRuleId ? { ...rule, ...params.routingRule } : rule
        ),
      })
    ),
  },
  guards: {
    hasRoutingRules: (_, params: { routing: RoutingDefinitionWithUIAttributes[] }) =>
      !isEmpty(params.routing),
    hasMultipleRoutingRules: ({ context }) => context.routing.length > 1,
    hasManagePrivileges: ({ context }) => context.definition.privileges.manage,
    hasSimulatePrivileges: ({ context }) => context.definition.privileges.simulate,
    isValidRouting: ({ context }) =>
      isSchema(routingDefinitionListSchema, context.routing.map(routingConverter.toAPIDefinition)),
    canDeleteRoutingRule: and(['hasManagePrivileges']),
    canEditRule: and(['hasManagePrivileges', not(stateIn('ready.reorderingRules'))]),
    canReorderRules: and(['hasManagePrivileges', 'hasMultipleRoutingRules']),
    canForkStream: and(['hasManagePrivileges', 'isValidRouting']),
    canUpdateStream: and(['hasManagePrivileges', 'isValidRouting']),
  },
}).createMachine({
  /** @xstate-layout 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-x1VwQ2iWKyLQugMgNQ-psG0GyNjd0sKZTYrqY2XxoZQJRkbyAeqXNvXcTotlciuNsURzEDSOkqcBDENRXG2CAA */
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
        'routingRule.create': {
          guard: and(['hasSimulatePrivileges', not(stateIn('ready.creatingNewRule'))]),
          target: '.creatingNewRule',
        },
        'routingRule.edit': [
          {
            guard: and(['canEditRule', ({ context, event }) => context.currentRuleId === event.id]),
            target: '.idle',
            actions: [{ type: 'storeCurrentRuleId', params: { id: null } }],
          },
          {
            guard: 'canEditRule',
            target: '.editingRule',
            actions: [{ type: 'storeCurrentRuleId', params: ({ event }) => event }],
          },
        ],
      },
      states: {
        idle: {
          id: 'idle',
          on: {
            'routingRule.reorder': {
              guard: 'canReorderRules',
              target: 'reorderingRules',
              actions: [{ type: 'reorderRouting', params: ({ event }) => event }],
            },
          },
        },
        creatingNewRule: {
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
                  actions: [{ type: 'storeRule', params: ({ event }) => event }],
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
          initial: 'changing',
          exit: [{ type: 'resetRoutingChanges' }],
          states: {
            changing: {
              on: {
                'routingRule.cancel': {
                  target: '#idle',
                  actions: [{ type: 'resetRoutingChanges' }],
                },
                'routingRule.change': {
                  actions: [{ type: 'storeRule', params: ({ event }) => event }],
                },
                'routingRule.remove': {
                  guard: 'canDeleteRoutingRule',
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
