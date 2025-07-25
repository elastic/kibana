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
  enqueueActions,
  setup,
  ActorRefFrom,
} from 'xstate5';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import { Streams, isSchema, routingDefinitionListSchema } from '@kbn/streams-schema';
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
import {
  createRoutingSamplesMachineImplementations,
  routingSamplesMachine,
} from './routing_samples_state_machine';

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
    routingSamplesMachine: getPlaceholderFor(() => routingSamplesMachine),
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
    setupRouting: assign((_, params: { definition: Streams.WiredStream.GetResponse }) => {
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
    storeDefinition: assign((_, params: { definition: Streams.WiredStream.GetResponse }) => ({
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
  /** @xstate-layout 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-R0K-PMf0T61RRZmvyVAlK2ayZ8LAIrfuObm2ksjQDUqrhm5iruKhTGvRKA+EaICaScYHj1une6cZ9tc1qzuPYQtWqS2-MAb8FQ1QAZvp-loTNoyPFXomppUqsUTQAw1IyTpLQCR5mVAogEeZ3w+C-WAFh3jhSeMQwI1gv6irqiaWRRQLhfkNBiXIIhq1+hbKcISPoCGkNZJnRwi9E7yCYcQHcdCclfApmkkaMDcgnEdHUu4DFGKnxdDOX4IAA */
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
          invoke: {
            id: 'routingSamplesMachine',
            src: 'routingSamplesMachine',
            input: ({ context }) => ({
              definition: context.definition,
              condition: selectCurrentRule(context).if,
            }),
          },
          states: {
            changing: {
              on: {
                'routingRule.cancel': {
                  target: '#idle',
                  actions: [{ type: 'resetRoutingChanges' }],
                },
                'routingRule.change': {
                  actions: enqueueActions(({ enqueue, event }) => {
                    enqueue({ type: 'patchRule', params: { routingRule: event.routingRule } });

                    // Trigger samples collection only on condition change
                    if (event.routingRule.if) {
                      enqueue.sendTo('routingSamplesMachine', {
                        type: 'routingSamples.updateCondition',
                        condition: event.routingRule.if,
                      });
                    }
                  }),
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
  data,
  timeState$,
  forkSuccessNofitier,
}: StreamRoutingServiceDependencies): MachineImplementationsFrom<typeof streamRoutingMachine> => ({
  actors: {
    deleteStream: createDeleteStreamActor({ streamsRepositoryClient }),
    forkStream: createForkStreamActor({ streamsRepositoryClient, forkSuccessNofitier }),
    upsertStream: createUpsertStreamActor({ streamsRepositoryClient }),
    routingSamplesMachine: routingSamplesMachine.provide(
      createRoutingSamplesMachineImplementations({
        data,
        timeState$,
      })
    ),
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
