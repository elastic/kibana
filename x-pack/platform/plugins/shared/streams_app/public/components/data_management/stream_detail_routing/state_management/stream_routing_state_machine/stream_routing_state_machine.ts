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
import { isEmpty, isEqual } from 'lodash';
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
    hasStagedChanges: ({ context }) => !isEqual(context.initialRouting, context.routing),
    hasManagePrivileges: ({ context }) => context.definition.privileges.manage,
    hasSimulatePrivileges: ({ context }) => context.definition.privileges.simulate,
    isValidRouting: ({ context }) =>
      isSchema(routingDefinitionListSchema, context.routing.map(routingConverter.toAPIDefinition)),
    canDeleteRoutingRule: and(['hasManagePrivileges']),
    canReorderRules: and(['hasManagePrivileges', 'hasMultipleRoutingRules']),
    canForkStream: and(['hasManagePrivileges', 'hasStagedChanges', 'isValidRouting']),
    canUpdateStream: and(['hasManagePrivileges', 'hasStagedChanges', 'isValidRouting']),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QCcD2BXALgSwHZQGVNkwBDAWwDo9sdSAbbALzygGIBtABgF1FQADqli1sqXPxAAPRAFYATABoQAT0QBGWQE5ZlLvIBsXACymA7MYMGAzFoC+d5WiysiJCpXcQVbWMTJUJADGYNgAbpDcfEggQiI44pIyCFoAHKmUqcbWqdbyZtbqtsZKqojWxlyUWjVpXGaG+vJcsg5OGDj4bgGeZN6UENiwAvSkKqwASh2T6PRwbM6dUBOzYJSQtFGScaKJMcnNZnqp2vrpOfJapWoI6vLGutrWZmZamvLyd6ltIIuu-h4vCoBkMRmNJtN8Cs5rBqBA5gtIctVr1UMgIGBkFsYjsEhJ9ohPkcuCctGdcqlLtcNLljJRjFl7oUTi8Sj8-l0AYE+sDBsNRuMoUjoXA4QiOci5pQgu5MGBsYJhLt8aADupiaTyRcrsobrJUup6bJCoU7ncuPZHL8kd1ATyQfzwUKXFDVrCZWQlgA5MAAdxF0oAFqR8KxES7JWsgiGQvQFbElXikhp1FxrJRbC0tAZ1MZ1Or1brEAYzIb86WzBbKfptOybVzeqR+nywYLlsK3dLZawff6UUFg6H8OGlgGByGYPHcWIVdJCQpjqd5OdKTqyggzKkjrlrIUrtYS5XvlaJbbuU3eaCBRCIyL3d38L2x4OoGGJQGAGZogDWU8TM+TBAHkNWotF3NNjWNXMiwQVIdEoZprAtAwFDeZ5j3aCMz0bZsryddtb07D1SG9P1Px-MMIHENY8DCVBvzWL9kG-M8AEEgkwNE-3iACCVuVN00zbQczzAszBgswS0oWRK3yYxJLJCx5DrLCGyBB1WxvUciIfKAnxRJjvzDTE0GQSgwUwJiqEMtiOK43htn-PZVRTNMMzJYTc3LQt13SI4tEk2QFHueTngMFSlmw9SW2vZ1tJhSh0AECASJmKVxyHdh337GMwDjBycSc2dklzSp6UkgwiVSfQvhgtJDRKbNjAC6rbFLCL-ncc9cMdNspkIhKkpS+KoxfN8O3Sl95QKxUeOcucgINSgzFkLh6ksGSbFsGC7kqzJsk3NbSxMZ4Os5LqcMvXqtLS0UhtS11JoncaBrWEhyFQCJuOVQCDDeSgrDzExqreGTUh2wx-M+OD5DyWQjE+M7CDU+0Yvw-qRthe6RqDZ7h2yqVYFIL6ZoTObiuLf7AdTBkLU0TcduedMSnULdgLgh5rCRqLUbwvqJru5KHsjXoPrCW62Co3AaNwOiGIGPKwDlWzOKxUnp3mkqHiqeSrCqmrlx2+pt0pFbrHhiwHjMbmUYvDTYoIzHEqFnH3s+iWTLRczRkstEqAxOZla5djVe+pM+NzIxyr19Vqs+Q313zNIEPSHRDFkSx1Bti7or5m7HsF4bbudouC8l6jqFl+i1iS2BMUwFX7OiWafoj+SdYq-X4-BxP7l0Tc4LZ82ig+bOelz664turGXeL7GPeQUzvZIqznbr5AG+Duy1ebsnW5c252+jyrY4NnubiKKxKHUNODGa1NXnCk96xz3nJ8d6fUXRTFP5INEMWQC9V2YB-6YjDrxA+8gFwkiXCuKkO1NoZjvptfQzVmqWkwpFW2PVNJTwLrCP+39AH4K-gAoBxdoy4FjOAzWGhTAdxjodbuO0HhaABgyehtIdAPDHnaO2aN+avQISAohv8RFkPxgLSgRMSa7w1hTICshDSVWah8B4xoSzqB2lYKoK0Xh-QMNVCwcFeHdSurgj+JDCESMjDPUuyMurl2lpXOWNcBDr03l1EOTdHLk0AqmdQBhMhKJktkN4pgAoIPhtfLgkdKq7lWsYUxl17bowFsI0BxDbEl2FmeNgnszIWVXrXeujcd6+P3gtAJQSTj0zCaVSJicSxBNWqyZ4dNDwOCtLgVAGJ4AxFPFyCp4cD4AFoDAwXGckmgdBGAsHwMMiBC0SgwSWugmoWQTgMiUckoEizaG3BJIuMky4KSXBvjBSoQTOY03zLEnQrRn6qVfvwvOeDbH7IUZoIJMCTlwLXDcZq6YdCmkkvTfQXMnlYJeTgh2GNP7YHhGAT5-iLDEk3M0TFCTqT8QCinDmac4KaEeZgzq4834WPhSQ4ipE+xzBRXxZodJflalXDiysVRdzgRkoUQwSSoVkr4bCtJQiuyeh7GRfsY0FmFT8Yy-6eQ8y0wtJYPMqy4IpzvrDCFBori7IpXC9JYrhb6SlIZVgDKD4rTpPDJk1ZmSvFWQ0BCaZAlKJKJo-lpLzrktee-Kl2T54F0tcs3cy1VrrRQpJXcWgdr03pESMkKErBIRJdaZ5vrhWCKdkGkWGVXwypbiMhaCgqhpFyDfTceRDHnw0AeOklwa05H1BaWG+q-WUqNbmgMbtxbBtlZUkqXAo7LmQTWiwFoIamGqNDEwgTPhM3bVm-OgbZ4FxySNENQ6o71ANB8NCDTGarQTazO+Fg2ppCXeYw1orrE-3wVuwkJhjmsvgYnBkGRUhjqgTfUwkLvUOMzdekVTs71ZLvKQ+9UBH0IFHZkAeFRDhWBqNol4mR1QlnqjfNIabBkwuA9msRmTP65rPDBmw1zjT1CCnanFgSo4FEal8bFWcBU+qFQR1gAAREipAAAKJBxZ+hg5oNhLLTnajo2naozxVrPGapSVjAGeYdodjxzA-HBPYD9GKZFA7i1qgyPJtIMaVEZ1rbBkwOtZP1E0fkDB6boVAdSW2dTmmwBCd9JQHpbmYOHBfRJtlMFmjJzAmi11lhwldLsEAA */
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
      type: 'parallel',
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
        displayingRoutingRules: {
          id: 'displayingRoutingRules',
          initial: 'idle',
          on: {
            'routingRule.create': {
              guard: and([
                'hasSimulatePrivileges',
                not(stateIn('ready.displayingRoutingRules.creatingNewRule')),
              ]),
              target: 'displayingRoutingRules.creatingNewRule',
            },
            'routingRule.edit': [
              {
                guard: and([
                  'hasManagePrivileges',
                  not(stateIn('ready.displayingRoutingRules.reorderingRules')),
                  ({ context, event }) => context.currentRuleId === event.id,
                ]),
                target: 'displayingRoutingRules.idle',
                actions: [{ type: 'storeCurrentRuleId', params: { id: null } }],
              },
              {
                guard: and([
                  'hasManagePrivileges',
                  not(stateIn('ready.displayingRoutingRules.reorderingRules')),
                ]),
                target: 'displayingRoutingRules.editingRule',
                actions: [{ type: 'storeCurrentRuleId', params: ({ event }) => event }],
              },
            ],
          },
          states: {
            idle: {
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
                      target: '#displayingRoutingRules.idle',
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
                      const currentRoutingRule = context.routing.find(
                        (rule) => rule.id === context.currentRuleId
                      );

                      if (!currentRoutingRule) {
                        throw new Error('Current routing rule not found');
                      }

                      return {
                        definition: context.definition,
                        if: currentRoutingRule.if,
                        destination: currentRoutingRule.destination,
                      };
                    },
                    onDone: {
                      target: '#displayingRoutingRules.idle',
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
                      target: '#displayingRoutingRules.idle',
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
                    input: ({ context }) => {
                      const currentRoutingRule = context.routing.find(
                        (rule) => rule.id === context.currentRuleId
                      );

                      if (!currentRoutingRule) {
                        throw new Error('Current routing rule not found');
                      }

                      return {
                        name: currentRoutingRule.destination,
                      };
                    },
                    onDone: {
                      target: '#displayingRoutingRules.idle',
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
                      target: '#displayingRoutingRules.idle',
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
                      target: '#displayingRoutingRules.idle',
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
                      target: '#displayingRoutingRules.idle',
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
        displayingDataPreview: {
          initial: 'idle',
          states: {
            idle: {},
            noData: {},
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
