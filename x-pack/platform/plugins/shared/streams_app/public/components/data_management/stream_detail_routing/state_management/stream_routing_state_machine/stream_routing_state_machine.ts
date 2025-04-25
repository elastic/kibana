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
  /** @xstate-layout N4IgpgJg5mDOIC5QCcD2BXALgSwHZQGVNkwBDAWwDo9sdSAbbALzygGIBtABgF1FQADqli1sqXPxAAPRAEYArAGZKipYoDsAFnnyAbLoCc8zQBoQAT0SLNXFQA5ZG3Zt1dN6gEwf1AXx9m0LFYiEgpKUIhzNlhiMioSAGMwbAA3SG4+JBAhERxxSRkEDVstAw95A00veS59M0sEco9KTTtWrV07Lg02uz8AjBx8ELjwskjqCHowNkChqAAldGnKBNDMMAzJHNF8rMKAWgrKdXl1A10PBW8PA1lnesQL2RP3Ljsr6w9NTX6QOeCsTCEXMk2ms0GrCWK0gtC2WR2eQk+0QB1alHkH1kdiMslOmjKRkeCFkVWUalOXD0HjsOl0fwBwyB8XGoOwUxmjMWyzAY1QyAgYGQ8MEwl2yNAh3Ruj0mmxXG8Z0UqmJsgM6nUJ0UBkJOP0ql+-n+kKZoRZpAmazI8wAcmAAO7Q3kJAAWpHwrAhQXwTtW7qS9BF2TFSIKcm6dkoDm0jjstPk91MFkQhmaNXuqnVF10jgZJsIzLGFtBVtItodvtd7qgnq5lbd+E2vG2IbEEukckUhhUBJ6nlanWJnWaijViixsa4sg8ee9BbNRct61YdsdPNWDZr+C9819sMwQcRbbDJOcafkNO8Lk8CeJ5xe2hldlUpI8hkUs-mI2BrNWy-wq71tWtb5r6ABm-IANaHq2eySuGmjKM43Q6uqXbWEmDSyFwbgnK4WIOG+OofkaXLfuaS7WiuFbrhByCQZ6EDiLyeApKgkG8nRkHkQAggkmD8jBuTHiiCDqKOlCXAqGpaFwnh3HeBIqEY8m1IYZyyJ+gILiCf5UQBNErFxnpCmgyCUAI9BlnRVBcbx-GCc2CKwe2hTYeqLTia0eJKLIfkeMSOLyBi5zqDKxhaOobRaaaoy6fuULrlWHrbnWSXrE2mSisJcEdiSqi6CceLPmqfltAYiiqtOmgnB8VIRQYXSITF85xb+CU+klm4gXOlb+mAgZOdl4onh8yjPm4FwaBpjWqsYtguGUCrYReVQzqR+bkYuoIddyKzJVu7Bpftm6ZS2OWuXI6hcAYlBuDUb66Fo7jjqqT2Rj8niknJtLlC1W3xRAoidSdwGpaB677kJI2idcD7Yoo7xnr5BiqqOD5ZtJ13Pmc-2FoDwN7c63Xg71kNAweshZcGF0nniLh3Z0VSXIhFTlKqiG3RUU6IeofkVXYvgbXOAPtRTiWgylR0QysJDkKgaTQ6GsN4oVNh2LoTiptolXJiSVQ1Zchhyd83yYoaAwi-jYuE0BUs7hLvKwKQitDTTMPwSSaqFV4OJVLSbQeF2qphbY2Ea1Ock6tOQuW1+1vFpQu2+nLCuO2wTG4CxuBsRxlCCtMGz2QJwpu0euWFKompxo4ZSKN8fmIaqHjvC0NLOFF1h82UeM6Tbu7rqnKTp6Z-IWVZmA2fnA1gEXzJ8SXSsiZ7063J5Ojm5U5V2HNXYtBNtReEHmLrXH2ltYnyfrugAgQGW6eZ9nue8jfsBCpgxeOdT5eXUUZyUFccS5sbDfGeiHcolAFDGHVImP2fRhbxz7pfcWIMX633vqgtgo9zKWWsvyKgr936f1Lt-FydNfZRkbmFL6lwAp6wzDVJQOg+bOD0NhC2xorZIImCQfkgpkCO1gHyAUQoeoD1lmAPhQol4V07JcABQc5I1FaNYVGesW41FeHiTMjh7iaQQefH8ideEiIEagoRJj+FiMdn6XAAYZG-xqB9SoRhtThWMPIYkLc8R3QVIhL4ckXC9wvjwyRpjBHCKsaTcRTsXZnWcrTWGVJbD6AJJUQwgcLheOVJqQwBgFTjmxJrNwwSjGhKkWYomQib530QXEDOzFqA53Ymgt+yAP7zwciQ86Hs8pkgxFvTwx8XxN3UVcQqao5QVQ7lSUpFFQSWNEeYygNSMGtQoFg5AZlx54OQAQgQbSOlmgXl-HpysV7YVsC3KK5xBakkwogLwN1KB3EKW0PmGg-BGlwKgQU8AshkWZGc5eeUDhQJOGcC4VwLzyXuG9GqjV2hPXKDhKkJEz6xTCDQOgjAWD4GBbI-KNUXBXh0OOCKugvGuEkihQWvM0nwIxes+ZBLf5grkhC84lxriwspXrccmpRwVSVAoaOsdOF1LKWyDkrKTzlFurUaOOIuhdkuJ4vWvRJI3EcG4hw4rAXcJLP+KAgEeSytEnzWwVJWg3ExAqHeesLwvAcNMtUgsjA6DmdtPSazTWS0OualeNJgoku8GUf2UVZCBVJC0ZUjc4xUiuF63SpZyxriMlBVgga8qnEjNaj4N4ug0kChVDEegMLlFUM+Awyb+6O2zYUQwmptBlE8JmcSaisKq08qzVoxEcz6s2gnCYV9-VZoSb0tytCVDnHKILVh3wHVYQqMobUBIdAXGxoOrhISdooKJmMeWw9UENsQKcZoncczYnaDYB5+VsIvOeofCMdxa3INttfdBMTT1iW0C0NmbaKgdpDnvfCF5wNANaG+8p4TzE-vUicSKnQLxTm8LrLCU0AFyl+uMgd9IDGYvmZEpZVTiOVJ-Y4boGJpyXB1NW6wfKGhXHcC0GUjVzg4QqrMgjzLvWLMqU6apX7DHkB-VoZQGp3DIe8Whrx1yoz5I0PXeu5xjBfJ8EAA */
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
