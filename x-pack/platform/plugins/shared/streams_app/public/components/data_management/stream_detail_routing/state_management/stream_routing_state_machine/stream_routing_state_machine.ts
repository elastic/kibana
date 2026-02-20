/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { MachineImplementationsFrom, ActorRefFrom } from 'xstate';
import { assign, and, enqueueActions, setup, sendTo, assertEvent } from 'xstate';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import type { Streams } from '@kbn/streams-schema';
import { isChildOf, isSchema, routingDefinitionListSchema } from '@kbn/streams-schema';
import { ALWAYS_CONDITION, conditionSchema } from '@kbn/streamlang';
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
  createQueryStreamActor,
  createQueryStreamSuccessNotifier,
} from './stream_actors';
import { routingConverter } from '../../utils';
import type { RoutingDefinitionWithUIAttributes } from '../../types';
import { selectCurrentRule } from './selectors';
import {
  createRoutingSamplesMachineImplementations,
  routingSamplesMachine,
} from './routing_samples_state_machine';
import type { PartitionSuggestion } from '../../review_suggestions_form/use_review_suggestions_form';

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
    createQueryStream: getPlaceholderFor(createQueryStreamActor),
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
    storeEditingSuggestion: assign(
      (_, params: { index: number; suggestion: PartitionSuggestion }) => ({
        editingSuggestionIndex: params.index,
        editedSuggestion: params.suggestion,
      })
    ),
    updateEditedSuggestion: assign(
      ({ context }, params: { updates: Partial<PartitionSuggestion> }) => ({
        editedSuggestion: context.editedSuggestion
          ? { ...context.editedSuggestion, ...params.updates }
          : null,
      })
    ),
    clearEditingSuggestion: assign(() => ({
      editingSuggestionIndex: null,
      editedSuggestion: null,
    })),
    setRefreshing: assign(() => ({ isRefreshing: true })),
    clearRefreshing: assign(() => ({ isRefreshing: false })),
    notifyQueryStreamSuccess: getPlaceholderFor(createQueryStreamSuccessNotifier),
  },
  guards: {
    canForkStream: and(['hasManagePrivileges', 'isValidRouting', 'isValidChild']),
    canReorderRules: and(['hasManagePrivileges', 'hasMultipleRoutingRules']),
    canUpdateStream: and(['hasManagePrivileges', 'isValidRouting']),
    canSaveSuggestion: and(['hasManagePrivileges', 'isValidEditedSuggestion']),
    hasMultipleRoutingRules: ({ context }) => context.routing.length > 1,
    hasManagePrivileges: ({ context }) => context.definition.privileges.manage,
    hasSimulatePrivileges: ({ context }) => context.definition.privileges.simulate,
    isAlreadyEditing: ({ context }, params: { id: string }) => context.currentRuleId === params.id,
    isValidRouting: ({ context }) =>
      isSchema(routingDefinitionListSchema, context.routing.map(routingConverter.toAPIDefinition)),
    isValidEditedSuggestion: ({ context }) => {
      if (!context.editedSuggestion) return false;
      const { name, condition } = context.editedSuggestion;
      if (!name || name.trim() === '') return false;
      return isSchema(conditionSchema, condition);
    },
    isValidChild: ({ context }) => {
      // If there's no current rule, skip validation (e.g., when editing suggestions)
      if (!context.currentRuleId) return true;

      const currentRule = selectCurrentRule(context);
      const currentStream = context.definition.stream;

      return isChildOf(currentStream.name, currentRule.destination);
    },
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QCcD2BXALgSwHZQGVNkwBDAWwDo9sdSAbbALzygGIBtABgF1FQADqli1sqXPxAAPRAFYATABoQAT0TyuANk2UuATlld9hzQGZNAdgC+V5WiysiJCpWcQVbWMTJUSAYzBsADdIbj4kECERHHFJGQQARllzSj0EgA5tZPSuC1N0i2U1BHMLABZKWU10hU0y-IT5cxs7DBx8Jx9XMnc2e3bCCgF6OEpYMEwAEVQ-dHIwXEwAWVJMPwALADFsekwwZDDJKNFYiPiEsrLZVLqasvT8h9MlVURTC009SnT6pvT-ixpBItED9RzeFxuDywdBQGBeMS4SgCEhBbBgADuhwixxiEjOiASeh0ZVyslkaT0XCeZUKrwQGnkFkoFnJ8k0sgsCS48gMmhBYI6EN8PQ8gqgACV0CNumjMQRYfC9hBsYJhCd8aBzsTKKTWRSidTTKZaUV1Jp2al6oDTFx8rl0gK2uDnCLSL0YXC4HjKJBaKrIuq8XFCTq9eTKUaTXTis8tJRPgorgZzPUnQ4ha7uu6VNQICM+s78FKZX5nHsA7jESHEpYdBYtEDOfIKWbEtyvrSLLzZJcElyyumBp1IaK8wXxSWwL6IP7eEcg9WCQz4+GDVSaTG5FwEqlZOkNJ9SeyLUOXV0oeOwIWM5LpdOSKhkBB9pXF6ctYgytUE5od1d5DKBJ+1kNteX+XQyl5fsCnkJIz0zC8xzLMgBgAOUxKdKA2Uh8FYG8BiwvxcICeg32iJdPwZTldz-eRMhqdkDVA+kLm-XRynZKkG0+TRgVsUEi0IYVs3cbDy1YDCMSI9ZcKgfDJ3vbDZPwMByI1Gt+2AllG2A5tW1Y2pUhqBJTGST5+z0awBPFEc3TElDVkkzClJwvD8AI1gsL9TB1ODZdD11Ml1yjU1WP+a4+IsB5qT0NJTxsoS7NE3NHPQlzSxU+SPMUmUADMnwAaz8yjpFDDRUmeJlzBqUwklMNsEiPFk9EAuq4IeUz+US29ksvNLnOkpSCuQQr8IgcRpzwIJUEK6cRsKuyAEE-EwJ8So-MrqK5BMeQY2pmMavj0iC5I0kBXJ2UdHrhxE-qJPwKSsIW-D9jQZBkXoVYRqoBbltW9b5xxd9NS2jQLl0LhZCSVrWQKBrWLoyoMis-JSSg7rWl6u6xx8rzXKyhShKI8s1KBtUKM284qsoEDyjq+p93ZRqyji2mtGAg8ufkFsEOErNLzx4sCbkonbyIkiwDI8nA0p0HqZ52nWXpi4zIPTQ2zqa5jDqECLiMeQ+b63HZ0IkX3PYXLpzcmANvl9QakoE0zHSNImTgrlGvyUwnaaxouueKp+Kx26BZN0Rhcy0WcuJpSfLtzTjXkJXOXqVWmY1+kPh0PQaihxoN0xwTsbDnMZwju8o4tzzI+neOEnCCmNICoCgv1SNN0a+iTq4ICW37Ulc9do2cbLoXK+twmY-FpSSHIVAQgT5dORO6He-Alte70BHikaJkWRNd51YKP9TBH0uxPHmTo8t2OZVgUhF5lqsqbkaLkfX3PN9ZnfCXML4nj5AMK7d4tJz5ITHqbfGMo54L2gdeCauApq4BmnNSgL4Rh7H+mtA4z8QaJyginFWjN1ZtkyMnFscUNBpHaqycBo5IEVywrAtEtc2BvSfJ9b6T4qAYImGAbBgNG6y2blRLkq8oIGGJByA8ZRGoZC4KkfQrVobmChqzeh9lcxXyUugAQEAnJsMQcg1B049HjGQJgQRuDhEv3tokMyyc6ZpxIczekBgKjJCqsBDIyReyaJSuXM2Mo9EGOCdeDhH1hjcOQFQcx+wrHChWjgpeYj+yUDgrSbecVWochYrvJkzIqhGBAQ8Yk1kQ7ngYWJR8z59jwNgN0J8L5kBi3CU0upNiFxyxrIYH22h-xJmAqyMCxodBMjrBoKG5hyQBMvLUlpDSOmLOnu04iuBSKpK2vrHQvZ6i0h5tSS4egwLu10HBVGFoKRzLHAs+ptdGl3Naas+BYxH5k1sfg5cDZk7Q32eULx28wKGGZL8BsmQoJ9huWXJ5SzQmGP5j4NgxjqAoNmmYgQFjEmumSUI7pojtmkl2ZcaMhyfiszAkBZkeRMhmX-FZPQ0KalgGafciejT4WhyRZErhmAfqUHiZY6xWz4g5F3PuY0udcgciZCc+kgEki0wpKSH47w7TNBulUrRsp0QYgVF6LwkBmFgDlBiNpryFoisQGYH2toNAWEBFcbk3YwKZEUWZLJTM4rklkEy3MqJdX6qVEa2eJrdXmtrthSW0tPk9OXI0B4qRuyWCZLS0h8qLQVD0NaBQ9FiT7j9Tq+UipvQhvykVcak1UWmMoH9JJAMunAzjVRBNPsrLsm7NFF2bjiiFMUQMoC0r0imUHJqxC1T-VhuLQa5Uz0K0eR5dEvlPDa1FWFXg5tW1k1O3KLnaoGhaR1DAh8Huw6MhciMICUyhbx5BtLRAbyUCPKeiVIiZSckwBoQoB8-F-kqJARJEyO0PNLhVFZnI+kh8dD-A6lBQwBoz5jsRROoJjgS2GofXHJ97AX3ejfTbMAABhcQUDxBWoQMeWmacahmHJA6iDsYTS0VyLSBR1Je43uw3ejDj6K41wnu+1S5H6g6CJAaV2w68gGVjIBHQSc6IwXMr6pDxtGHDnQ7OrDfGrZRo2VLcjDYKi0lMK1UyO53gtjbMaK4lQ-wWlZIBYdDxOMV245pmU49PAabfQ-EIbnEQGd7rqPIpnbSmW7Pkt44HdBaw+LnC4XIbACVwKgF88AIi2WFL+0q8QAC0mdij5YCTQOgjAWD4Gy6-CjLxijDqdjzVqTqqg8zyH6yr9iLjXDXB3azW4SiK2HYBXIPIrImELdgfMYB2s1notDFkUzqiXRBX1+1PcoJQy5ESFGo7Knju1QNR6GUptNoJecbQPseJNgi3KgpKQaNJGqNyV2cFC0HagE9c22UoDTfjayftdori90cVUSLtZ96UJ+NFFGlhXsPXe0d1do1WA-aojzRW0UHW9ipIe3IR0mpOwPFyBQ9G0gufCSj7Z2824RkNJ3ViPJFEfCSJkC4Fl2Rk9eTbZHJ2-1bWeBUQC9E9IyMAn1i4iaKRaGzqSKo7wOeRpYfAin8Rs27mioYKyTqk5i62+zRoFIqp2flwJzlSuec5cQKrlkedNeqOeGL40Psplxj-HcIumWL6TtZc89lyuvzkl-IMhVIFTk8lpoBaG-cdzXpU6PZl3ulmwoq+bqr2RaZNT2dSaGoO2q7NUf2eiHbEO7eQ9qpP7KBX6IRXZP3iQeSieSA2JIs2UyUt5Oc20XJ6Lq+c7Hz3Ra9UabLcdpuvP4hXEin+TrweRkZpyCyfcT3njPCpMX4uXKUMBuncGzDMCp1muT6Pi3CA+mB+n0BEP8roqdjyJvDQMVt6Fq34Pmdw-EdjUPyIsfluzJKvbk1CfOCY9OrbNQwdeEdAwY3NzYfWvD1KjOqGjMyTkcoKzYCJxMVAwNeHIHbdfLVQJW9IfXfOubDWve4fpfsQEfcYnJIb8KzRvJVaocpIwd4RlJLIAA */
  id: 'routingStream',
  context: ({ input }) => ({
    currentRuleId: null,
    definition: input.definition,
    initialRouting: [],
    routing: [],
    suggestedRuleId: null,
    editingSuggestionIndex: null,
    editedSuggestion: null,
    isRefreshing: false,
  }),
  initial: 'initializing',
  states: {
    initializing: {
      always: 'ready',
    },
    ready: {
      id: 'ready',
      initial: 'ingestMode',
      entry: [
        { type: 'setupRouting', params: ({ context }) => ({ definition: context.definition }) },
      ],
      on: {
        'stream.received': {
          target: '#ready',
          actions: [
            { type: 'storeDefinition', params: ({ event }) => event },
            { type: 'clearRefreshing' },
          ],
          reenter: true,
        },
        'routingSamples.setDocumentMatchFilter': {
          actions: sendTo('routingSamplesMachine', ({ event }) => ({
            type: 'routingSamples.setDocumentMatchFilter',
            filter: event.filter,
          })),
        },
        'suggestion.preview': {
          actions: [
            sendTo('routingSamplesMachine', ({ event, context }) => ({
              type: 'routingSamples.setSelectedPreview',
              preview: event.toggle
                ? { type: 'suggestion', name: event.name, index: event.index }
                : undefined,
              condition: event.toggle
                ? event.condition
                : context.currentRuleId
                ? selectCurrentRule(context)?.where
                : undefined,
            })),
            sendTo('routingSamplesMachine', {
              type: 'routingSamples.setDocumentMatchFilter',
              filter: 'matched',
            }),
          ],
        },
        'routingRule.reviewSuggested': {
          target: '#ready.ingestMode.reviewSuggestedRule',
          actions: [{ type: 'storeSuggestedRuleId', params: ({ event }) => event }],
        },
        'suggestion.edit': {
          target: '#ready.ingestMode.editingSuggestedRule',
          actions: enqueueActions(({ enqueue, event }) => {
            enqueue({ type: 'storeEditingSuggestion', params: event });

            // Set the preview for the suggestion being edited
            enqueue.sendTo('routingSamplesMachine', {
              type: 'routingSamples.setSelectedPreview',
              preview: { type: 'suggestion', name: event.suggestion.name, index: event.index },
              condition: event.suggestion.condition,
            });
          }),
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
        ingestMode: {
          id: 'ingestMode',
          initial: 'idle',
          on: {
            'childStreams.mode.changeToQueryMode': {
              target: '#queryMode',
            },
            'routingSamples.setDocumentMatchFilter': {
              actions: sendTo('routingSamplesMachine', ({ event }) => ({
                type: 'routingSamples.setDocumentMatchFilter',
                filter: event.filter,
              })),
            },
            'suggestion.preview': {
              target: '#ingestMode.idle',
              actions: [
                sendTo('routingSamplesMachine', ({ event }) => ({
                  type: 'routingSamples.setSelectedPreview',
                  preview: event.toggle
                    ? { type: 'suggestion', name: event.name, index: event.index }
                    : undefined,
                })),
                sendTo('routingSamplesMachine', ({ event }) => ({
                  type: 'routingSamples.updateCondition',
                  condition: event.toggle ? event.condition : undefined,
                })),
                sendTo('routingSamplesMachine', {
                  type: 'routingSamples.setDocumentMatchFilter',
                  filter: 'matched',
                }),
              ],
            },
            'routingRule.reviewSuggested': {
              target: '#ingestMode.reviewSuggestedRule',
              actions: [{ type: 'storeSuggestedRuleId', params: ({ event }) => event }],
            },
            'suggestion.edit': {
              target: '#ingestMode.editingSuggestedRule',
              actions: enqueueActions(({ enqueue, event }) => {
                enqueue({ type: 'storeEditingSuggestion', params: event });

                // Set the preview for the suggestion being edited
                enqueue.sendTo('routingSamplesMachine', {
                  type: 'routingSamples.setSelectedPreview',
                  preview: { type: 'suggestion', name: event.suggestion.name, index: event.index },
                });

                // Update condition for preview
                enqueue.sendTo('routingSamplesMachine', {
                  type: 'routingSamples.updateCondition',
                  condition: event.suggestion.condition,
                });
              }),
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
              entry: [
                { type: 'addNewRoutingRule' },
                sendTo('routingSamplesMachine', {
                  type: 'routingSamples.setSelectedPreview',
                  preview: { type: 'createStream' },
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
                      actions: [{ type: 'setRefreshing' }, { type: 'refreshDefinition' }],
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
                        sendTo('routingSamplesMachine', {
                          type: 'routingSamples.updateCondition',
                          condition: undefined,
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
                      actions: [{ type: 'setRefreshing' }, { type: 'refreshDefinition' }],
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
                      actions: [
                        { type: 'notifyStreamSuccess' },
                        { type: 'setRefreshing' },
                        { type: 'refreshDefinition' },
                      ],
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
                      actions: [
                        { type: 'notifyStreamSuccess' },
                        { type: 'setRefreshing' },
                        { type: 'refreshDefinition' },
                      ],
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
                      actions: [
                        { type: 'resetSuggestedRuleId' },
                        { type: 'setRefreshing' },
                        { type: 'refreshDefinition' },
                      ],
                    },
                    onError: {
                      target: 'reviewing',
                      actions: [{ type: 'notifyStreamFailure' }],
                    },
                  },
                },
              },
            },
            editingSuggestedRule: {
              id: 'editingSuggestedRule',
              initial: 'editing',
              exit: [{ type: 'clearEditingSuggestion' }],
              states: {
                editing: {
                  on: {
                    'suggestion.changeName': {
                      actions: enqueueActions(({ context, enqueue, event }) => {
                        enqueue({
                          type: 'updateEditedSuggestion',
                          params: { updates: { name: event.name } },
                        });

                        // Update the preview name (without triggering refetch)
                        enqueue.sendTo('routingSamplesMachine', {
                          type: 'routingSamples.updatePreviewName',
                          name: event.name,
                        });
                      }),
                    },
                    'suggestion.changeCondition': {
                      actions: enqueueActions(({ enqueue, event }) => {
                        enqueue({
                          type: 'updateEditedSuggestion',
                          params: { updates: { condition: event.condition } },
                        });

                        // Update the condition for preview (triggers refetch)
                        enqueue.sendTo('routingSamplesMachine', {
                          type: 'routingSamples.updateCondition',
                          condition: event.condition,
                        });
                      }),
                    },
                    'routingRule.change': {
                      actions: enqueueActions(({ enqueue, event }) => {
                        if (event.routingRule.where) {
                          enqueue({
                            type: 'updateEditedSuggestion',
                            params: { updates: { condition: event.routingRule.where } },
                          });

                          enqueue.sendTo('routingSamplesMachine', {
                            type: 'routingSamples.updateCondition',
                            condition: event.routingRule.where,
                          });
                        }
                      }),
                    },
                    'routingRule.cancel': {
                      target: '#ready.ingestMode.idle',
                      actions: [
                        { type: 'clearEditingSuggestion' },
                        sendTo('routingSamplesMachine', {
                          type: 'routingSamples.setSelectedPreview',
                          preview: undefined,
                        }),
                      ],
                    },
                    'suggestion.saveSuggestion': {
                      guard: 'canSaveSuggestion',
                      target: '#ready.ingestMode.idle',
                      actions: [
                        { type: 'clearEditingSuggestion' },
                        sendTo('routingSamplesMachine', {
                          type: 'routingSamples.setSelectedPreview',
                          preview: undefined,
                        }),
                      ],
                    },
                  },
                },
              },
            },
          },
        },
        queryMode: {
          id: 'queryMode',
          initial: 'idle',
          on: {
            'childStreams.mode.changeToIngestMode': '#ingestMode',
          },
          states: {
            idle: {
              on: {
                'queryStream.create': {
                  guard: 'hasManagePrivileges',
                  target: 'creating',
                },
              },
            },
            creating: {
              initial: 'changing',
              on: {
                'queryStream.cancel': 'idle',
              },
              states: {
                changing: {
                  on: {
                    'queryStream.save': 'saving',
                  },
                },
                saving: {
                  invoke: {
                    src: 'createQueryStream',
                    input: ({ event }) => {
                      assertEvent(event, 'queryStream.save');
                      return {
                        name: event.name,
                        esqlQuery: event.esqlQuery,
                      };
                    },
                    onDone: {
                      target: '#queryMode.idle',
                      actions: [
                        { type: 'notifyQueryStreamSuccess' },
                        { type: 'setRefreshing' },
                        { type: 'refreshDefinition' },
                      ],
                    },
                    onError: {
                      target: 'changing',
                      actions: [{ type: 'notifyStreamFailure' }],
                    },
                  },
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
        telemetryClient,
      })
    ),
    createQueryStream: createQueryStreamActor({ streamsRepositoryClient }),
  },
  actions: {
    refreshDefinition,
    notifyStreamSuccess: createStreamSuccessNofitier({
      toasts: core.notifications.toasts,
    }),
    notifyStreamFailure: createStreamFailureNofitier({
      toasts: core.notifications.toasts,
    }),
    notifyQueryStreamSuccess: createQueryStreamSuccessNotifier({
      toasts: core.notifications.toasts,
    }),
  },
});
