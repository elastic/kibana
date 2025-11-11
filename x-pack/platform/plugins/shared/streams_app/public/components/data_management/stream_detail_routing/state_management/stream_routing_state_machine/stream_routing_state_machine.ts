/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { MachineImplementationsFrom, ActorRefFrom } from 'xstate5';
import { assign, and, enqueueActions, setup, sendTo, assertEvent } from 'xstate5';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import type { Streams } from '@kbn/streams-schema';
import { isChildOf, isSchema, routingDefinitionListSchema } from '@kbn/streams-schema';
import { ALWAYS_CONDITION } from '@kbn/streamlang';
import type { RoutingDefinition } from '@kbn/streams-schema';
import type {
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
import type { RoutingDefinitionWithUIAttributes } from '../../types';
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
        where: ALWAYS_CONDITION,
        status: 'enabled',
        isNew: true,
      });

      return {
        currentRuleId: newRule.id,
        routing: [...context.routing, newRule],
      };
    }),
    appendRoutingRules: assign(({ context }, params: { definitions: RoutingDefinition[] }) => {
      return {
        routing: [...context.routing, ...params.definitions.map(routingConverter.toUIDefinition)],
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
    storeSuggestedRuleId: assign((_, params: { id: StreamRoutingContext['suggestedRuleId'] }) => ({
      suggestedRuleId: params.id,
    })),
    resetSuggestedRuleId: assign(() => ({
      suggestedRuleId: null,
    })),
  },
  guards: {
    canForkStream: and(['hasManagePrivileges', 'isValidRouting', 'isValidChild']),
    canReorderRules: and(['hasManagePrivileges', 'hasMultipleRoutingRules']),
    canUpdateStream: and(['hasManagePrivileges', 'isValidRouting']),
    hasMultipleRoutingRules: ({ context }) => context.routing.length > 1,
    hasManagePrivileges: ({ context }) => context.definition.privileges.manage,
    hasSimulatePrivileges: ({ context }) => context.definition.privileges.simulate,
    isAlreadyEditing: ({ context }, params: { id: string }) => context.currentRuleId === params.id,
    isValidRouting: ({ context }) =>
      isSchema(routingDefinitionListSchema, context.routing.map(routingConverter.toAPIDefinition)),
    isValidChild: ({ context }) => {
      // If there's no current rule, skip validation (e.g., when editing suggestions)
      if (!context.currentRuleId) return true;

      const currentRule = selectCurrentRule(context);
      const currentStream = context.definition.stream;

      return isChildOf(currentStream.name, currentRule.destination);
    },
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QCcD2BXALgSwHZQGVNkwBDAWwDo9sdSAbbALzygGIBtABgF1FQADqli1sqXPxAAPRACZZATkoA2AIwAWABwL1sgKybZG1bIA0IAJ6IAzKr2V1XLgs3WA7Jq7uFb5QF8-czQsViISCkpwiAs2WGIyKhIAYzBsADdIbj4kECERHHFJGQRVBS5ZSh9y8uU9PWtrPTdzKwRZdWVKTWVZQz0FOx7ZNz0AoIwcfDCEyLJo6gh6MDZgyagAJXQlyiTwzDAsyTzRQpzi9V1KPWUFAe1Pa2UevRbEVVLOrmv39W9DdTGIFWoXiESiFgWSxWE1Ym22kFohxyxwKEjONk09lkQ00vgMei4yk0rxKhK4lDcdzc1gGqlqdkBwKmoMScwh2EWyyZGy2YFmqGQEDAyCRgmEJzRoGKAFpVNYuuo3HYdKpCQplE5iZY3rIuOpKIpugomnpdN0AYEgTDmeFWaR5rsyGsAHJgADucL5SQAFqR8KxoSF8J6dn6UvRRblxaiim8vJouho9HLNJjk8p1CSbhUCXTGj51WprIzrYQWbN7RDHaQXe6Qz6-VAA9z6778AdeEdo2JJdI3o8lNZ1Ap3Lj2t0ta0iRVbCPDO9rJ4TCWg2XbRWHXtWK6Pbydm2m-hA2sQwjMJGUT3YyUMzm9L1hh03PpVCTKaoHNcDI0NNiRyu1mmME2R2Ld8B3VtG2bUsQwAMwFABrC9u1OKU41+FRHBpW5qWUIdM21Uk9QpDV500Ewbn-S1uSAu1Nydbc6z3eDkAQgMIHEPk8DSVAEL5FiENogBBJJMAFZD8ivdEEGpD8enKNxFMcZ8BjfYdKBpJpFEJG4mlUACQXXcFQIY8CmO2ASA2FNBkEoAR6BrFiqAE4TRPEztkRQ3tilVHwHGpLRVBGWx3jMQjtHsJofFqU03EVTQLXGVdaI3CEz1hPcG39I8W0yvYO2yMVJNQvsSkaTolQ8Wd3gSkcSVC-UPF1OpFRcPVi2o0sUuM9Lg0yg9oNXeswzACMPKKiVr0MeVXD1dV3D0lx6tNckOgUXUjC+dp5AMm0Zh6iBRD67YssPdhcpOg8Cq7YrvLeNxnEoPUCWxZQ4sVRd6rehMLmfDQuA8e9Rk65LywOo6eUuqCcpgvczwkybpLsIwHFUWbzX0Wd6pChwCwUh7XCaXa132kDeshr0Bphoa4cO89VEKqNbuvIKOieoldB6X5+n0erfiUfouA0dx3jnNxie6sm6YyqHsvO2HthIchUAyBGYyRoLOkcbp3Cedb1HqPn2hUP8Ae2g2EolsGpYhyC5ePGW+VgUhVfGpnEbQkoPgNXodF6AxdEeerfHJVVuiFgHbhMcWQcA63K0ocmQyVlXHbYDjcC43AeL4yghSWfZXLEkU3cvErikaNwunI-n4rUIKXkIkwLie75hcpf4raMm2Tz3FO0jT6yBTshzMCcvPRrAQuWRE4u1akz2TEUfy6gDnRasnN56i12bCXkWRGkMLvSYTpO93QAQIBrNOM6znO+Qv2BhUwIv3MZsu7oQSuDSCw+LnKRUFxg76EoHYU0Pg6RaHXsfYCp9pbHQfpfa+CC2BD1svZRyAoqCP2fq-Eu78vIs3kAmciGhfB-SGF9IcVxGh6QzN8PUMC6IQhIAKIUyBHawH5IKYUg1e6KzAGw4U89y79h6D7awAMCRaCHAoEkzVyRxV-v0OUdJ9Kx0MifeYrCeEcIQVwnR7C+GO1DLgcMIjP4Eh+joY0NIYqmkbq0XUQUnoAIaLoAGHQmGpW4UY-RvjeHU34U7F211PLMyRl8ckTxhw6BuAlRQyh5ENCrpRcoi40Z4UYRovasDtGCN0ZwygF8r5x1tOnTi1Bs68UQU-ZAL8Z5uXwTdD2pVA5XHXs+A+9Rky-HkUYTopR1ClEeIqL43jjKGMCRTLhJTkEkwoKg5ANkR6YOQNggQdSGm2lnm-Fp6tF6qnJLqDwHclRAMIvIR6AwMkJSVO4AIlpcCoCFPAHINEWT7IXqVWUj07nKmGWqDUr4m4t3oWUDwPhXDWHaN4mgdBGAsHwF80RbQ6RdCeEYIKQVPDDmsMkioSYyg3LRnmYGSUylaNaBNA5Py1AKiVP0QFNxgUkkXFXWcjgfAjHvOMnJCzmGQjACiz++glBqjuG1R4zwSQJQTD0P6DR1TkRjhSzReSqxgSgBBXkIrrxKnJF8LQwx9CeF6CSe8H5yIjluPoYZosJkgWrLWXcsszp6qRv7BwQxKTbVxORWVGgHANB+KmLa6i1W5MFc6xirr+KIVYB6z2IwExGsMM+Aw5RN4IG0PKOoeELiY2-AoR1cDba6vCa04oNwq4G3Ws+fM1I5FN01v5bmdqPH+H5ZLMtwT9zQygEm0qdJ5AaV9QYXwBtxzLRHBpGxdR1QE1VVaUG3de0mP7o7IdxQRgVCqvXOVcU9TY1VJUd6e94wDFLfMM+2w5nBO3YgOK9g60msbTSYOjwVBcExPofQ1JTSaGvSwgpfiZmPoQLpCkcVfC-qFsMfFTd5oGmGcaHl7hhyyGAwEvRMycOJsrbSnyki80UUUC4GkQ4kmXLId6-ouIyjOEkeSldlKNX4f8fe9V5AINxXlEpWDvLo6IacScroZR3AwphZSU0jy-BAA */
  id: 'routingStream',
  context: ({ input }) => ({
    currentRuleId: null,
    definition: input.definition,
    initialRouting: [],
    routing: [],
    suggestedRuleId: null,
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
        'routingSamples.setDocumentMatchFilter': {
          actions: enqueueActions(({ enqueue, event }) => {
            enqueue.sendTo('routingSamplesMachine', {
              type: 'routingSamples.setDocumentMatchFilter',
              filter: event.filter,
            });
          }),
        },
        'suggestion.preview': {
          target: '#idle',
          actions: enqueueActions(({ enqueue, event }) => {
            enqueue.sendTo('routingSamplesMachine', {
              type: 'routingSamples.setSelectedPreview',
              preview: event.toggle
                ? { type: 'suggestion', name: event.name, index: event.index }
                : undefined,
            });
            enqueue.sendTo('routingSamplesMachine', {
              type: 'routingSamples.updateCondition',
              condition: event.toggle ? event.condition : undefined,
            });
            enqueue.sendTo('routingSamplesMachine', {
              type: 'routingSamples.setDocumentMatchFilter',
              filter: 'matched',
            });
          }),
        },
        'routingRule.reviewSuggested': {
          target: '#ready.reviewSuggestedRule',
          actions: [{ type: 'storeSuggestedRuleId', params: ({ event }) => event }],
        },
      },
      invoke: {
        id: 'routingSamplesMachine',
        src: 'routingSamplesMachine',
        input: ({ context }) => ({
          definition: context.definition,
          documentMatchFilter: 'matched',
        }),
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
          entry: [
            { type: 'addNewRoutingRule' },
            sendTo('routingSamplesMachine', {
              type: 'routingSamples.setSelectedPreview',
              preview: { type: 'createStream' },
            }),
            sendTo('routingSamplesMachine', {
              type: 'routingSamples.updateCondition',
              condition: { always: {} },
            }),
          ],
          exit: [
            { type: 'resetRoutingChanges' },
            sendTo('routingSamplesMachine', {
              type: 'routingSamples.setSelectedPreview',
              preview: undefined,
            }),
            sendTo('routingSamplesMachine', {
              type: 'routingSamples.updateCondition',
              condition: undefined,
            }),
            sendTo('routingSamplesMachine', {
              type: 'routingSamples.setDocumentMatchFilter',
              filter: 'matched',
            }),
          ],
          initial: 'changing',
          states: {
            changing: {
              on: {
                'routingRule.cancel': {
                  target: '#idle',
                  actions: [
                    { type: 'resetRoutingChanges' },
                    sendTo('routingSamplesMachine', {
                      type: 'routingSamples.setDocumentMatchFilter',
                      filter: 'matched',
                    }),
                  ],
                },
                'routingRule.change': {
                  actions: enqueueActions(({ enqueue, event }) => {
                    enqueue({ type: 'patchRule', params: { routingRule: event.routingRule } });

                    // Trigger samples collection only on condition change
                    if (event.routingRule.where) {
                      enqueue.sendTo('routingSamplesMachine', {
                        type: 'routingSamples.updateCondition',
                        condition: event.routingRule.where,
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
                    where: currentRoutingRule.where,
                    destination: currentRoutingRule.destination,
                    status: currentRoutingRule.status,
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
          entry: [
            sendTo('routingSamplesMachine', {
              type: 'routingSamples.setSelectedPreview',
              preview: { type: 'updateStream' },
            }),
          ],
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
                  actions: [
                    { type: 'resetRoutingChanges' },
                    sendTo('routingSamplesMachine', {
                      type: 'routingSamples.setDocumentMatchFilter',
                      filter: 'matched',
                    }),
                  ],
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
          entry: [
            sendTo('routingSamplesMachine', {
              type: 'routingSamples.setSelectedPreview',
              preview: { type: 'updateStream' },
            }),
          ],
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
        reviewSuggestedRule: {
          id: 'reviewSuggestedRule',
          initial: 'reviewing',
          states: {
            reviewing: {
              on: {
                'routingRule.fork': {
                  guard: 'canForkStream',
                  target: 'forking',
                },
                'routingRule.cancel': {
                  target: '#idle',
                  actions: [{ type: 'resetSuggestedRuleId' }],
                },
              },
            },
            forking: {
              invoke: {
                id: 'forkStreamActor',
                src: 'forkStream',
                input: ({ context, event }) => {
                  assertEvent(event, 'routingRule.fork');

                  const { routingRule } = event;
                  if (!routingRule) {
                    throw new Error('No routing rule to fork');
                  }

                  return {
                    definition: context.definition,
                    destination: routingRule.destination,
                    where: routingRule.where,
                    status: 'enabled',
                  };
                },
                onDone: {
                  target: '#idle',
                  actions: [{ type: 'refreshDefinition' }, { type: 'resetSuggestedRuleId' }],
                },
                onError: {
                  target: 'reviewing',
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
  telemetryClient,
}: StreamRoutingServiceDependencies): MachineImplementationsFrom<typeof streamRoutingMachine> => ({
  actors: {
    deleteStream: createDeleteStreamActor({ streamsRepositoryClient }),
    forkStream: createForkStreamActor({
      streamsRepositoryClient,
      forkSuccessNofitier,
      telemetryClient,
    }),
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
