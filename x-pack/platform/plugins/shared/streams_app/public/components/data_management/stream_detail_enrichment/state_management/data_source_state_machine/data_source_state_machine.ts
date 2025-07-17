/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ActorRefFrom,
  MachineImplementationsFrom,
  SnapshotFrom,
  assertEvent,
  assign,
  sendTo,
  setup,
} from 'xstate5';
import { SampleDocument } from '@kbn/streams-schema';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import { isEqual, omit } from 'lodash';
import {
  DataSourceInput,
  DataSourceContext,
  DataSourceEvent,
  DataSourceMachineDeps,
  DataSourceToParentEvent,
} from './types';
import {
  createDataCollectionFailureNofitier,
  createDataCollectorActor,
} from './data_collector_actor';
import { EnrichmentDataSourceWithUIAttributes } from '../../types';

export type DataSourceActorRef = ActorRefFrom<typeof dataSourceMachine>;
export type DataSourceActorSnapshot = SnapshotFrom<typeof dataSourceMachine>;

export const dataSourceMachine = setup({
  types: {
    input: {} as DataSourceInput,
    context: {} as DataSourceContext,
    events: {} as DataSourceEvent,
  },
  actors: {
    collectData: getPlaceholderFor(createDataCollectorActor),
  },
  delays: {
    dataSourceChangeDebounceTime: 800,
  },
  actions: {
    notifyDataCollectionFailure: getPlaceholderFor(createDataCollectionFailureNofitier),
    storeDataSource: assign(
      ({ context }, params: { dataSource: EnrichmentDataSourceWithUIAttributes }) => ({
        dataSource: { ...params.dataSource, id: context.dataSource.id },
      })
    ),
    storeData: assign((_, params: { data: SampleDocument[] }) => ({ data: params.data })),
    toggleDataSourceActivity: assign(({ context }) => ({
      dataSource: { ...context.dataSource, enabled: !context.dataSource.enabled },
    })),
    notifyParent: sendTo(
      ({ context }) => context.parentRef,
      ({ context }, params: { eventType: DataSourceToParentEvent['type'] }) => ({
        type: params.eventType,
        id: context.dataSource.id,
      })
    ),
  },
  guards: {
    isEnabled: ({ context }) => context.dataSource.enabled,
    isDeletable: ({ context }) => context.dataSource.type !== 'random-samples', // We don't allow deleting the random-sample source to always have a data source available
    isValidData: (_, params: { data?: SampleDocument[] }) => Array.isArray(params.data),
    shouldCollectData: ({ context, event }) => {
      assertEvent(event, 'dataSource.change');
      /**
       * Determines if the dataSource update contains substantive changes.
       * Ignores cosmetic changes like name updates that don't affect functionality.
       */
      const ignoredProps = ['name'];
      return !isEqual(omit(context.dataSource, ignoredProps), omit(event.dataSource, ignoredProps));
    },
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QQIYBcUGUD2BXATgMZgDEqGOBxAdBGADZhpgDaADALqKgAO2sASzQDsAO24gAHogCcMgMzUZAdlUAmNcpkBWACwBGfQBoQAT0S6AbIrYAOW5pn7ry2-rbKAvp5PkseIlI-SkDqNGwoKEYAQUJhADchU3YuJBA+QWExCWkENQNqZQ8ZNQUithldE3MEXTVLamttfRk3S202Uo9vX3R-KiC+kJpwyJi4gUS0ZP1U3n4hEXE03OtbajV5W11leTr9eWU1aot6xvlm1ucO0p6QYICaOmZ8AFsBUQ+oEhSJDMXsitEABafRqahsfS2eRsSz6ZTaaEIzYnBCI5TUeQySH6XQXEpwrw+e5DR5gWhMMBvD5fH6zP4LLLLUC5ZzrXH2WwySw6KHaZRVMyIRENLRqbSVWGWIpqO4PAbUMCiFAAI0YEDIpIV+DAADMdbAABa-NL-Jk5RDuNjUDm6Wwi3YVfTaVFIiH83TNTryUpqfRyrWhJWq9Waihk6iEQ0oUQwE3zTJLC1ojqFZS49MeXYdF1ChAlfQ2uoVG5aOQyAPhhXBtWQMP9UJRmNx+mmxlJoEIK3aG2tBE7O0HPGogtFtQlzq2SsNmg19UUlV4USEL4AYWjsbgJEksAwzGoKF1LwAFPLAuvm2AACJgRe4ZdgAAqAleYAAlPXhuS55AF0uV7GF6brA8bpO2gIsog8jQRCVh4jC456LYyiWKi7gOEo8jwkhKjuK405foqyq1hA1D0NgKAQF8V59CQVL4Ng+DUDw9DoLqjGvLQfSrtg9CMHEjGxOE+CgWaHaQQg0I2to1gIZ0zjSsoaFsDBbCdCplwwgc3jEqI2B0PAaRnsQDKJhBUggnC1C2Gp0qWDsOibChqLQTINoXOOyFFPClgERGzxUu8nyxqZALMhZCCgjY8KuDJGZOChxx5p6hbtNoFzpR0dTjrofnVsR6qheanZRdZtkoQ52hORKqIytQ2genCMKqPy2h5UGBW-gIECMEV4kRc6GJYh44oOLsliaGhGjgnYpTws4nTtESvRVh1Ia-nQd7LmuG4wIZCZhcmE1uc6dQ7DJRSejIykCpiDhsJ6dq6E41jtbOnWkeRlHUX0fXmbkey9gomxVQ9iWCjUJTWnizSGItMnbG95JUbA60QH94UA9YGyGPaOzOs6kIQ8K9pFkTHQoQ42nEsZyMMJS6NtmZmOWip6ytRcWJ2viqF5jJ1rDWCmhsIilQVjpQA */
  id: 'dataSource',
  context: ({ input }) => ({
    parentRef: input.parentRef,
    dataSource: input.dataSource,
    streamName: input.streamName,
    data: [],
  }),
  initial: 'determining',
  on: {
    'dataSource.delete': {
      guard: 'isDeletable',
      target: '.deleted',
    },
    'dataSource.toggleActivity': [
      {
        guard: 'isEnabled',
        target: '.disabled',
        actions: [
          { type: 'toggleDataSourceActivity' },
          { type: 'notifyParent', params: { eventType: 'dataSource.change' } },
        ],
      },
      {
        target: '.enabled',
        actions: [
          { type: 'toggleDataSourceActivity' },
          { type: 'notifyParent', params: { eventType: 'dataSource.change' } },
        ],
      },
    ],
  },
  states: {
    determining: {
      always: [{ target: 'enabled', guard: 'isEnabled' }, { target: 'disabled' }],
    },
    enabled: {
      initial: 'loadingData',
      on: {
        'dataSource.refresh': '.loadingData',
        'dataSource.change': [
          {
            guard: 'shouldCollectData',
            target: '.debouncingChanges',
            reenter: true,
            actions: [
              { type: 'storeDataSource', params: ({ event }) => event },
              { type: 'notifyParent', params: { eventType: 'dataSource.change' } },
            ],
          },
          {
            actions: [
              { type: 'storeDataSource', params: ({ event }) => event },
              { type: 'notifyParent', params: { eventType: 'dataSource.change' } },
            ],
          },
        ],
      },
      exit: [{ type: 'notifyParent', params: { eventType: 'dataSource.dataChange' } }],
      states: {
        idle: {},
        debouncingChanges: {
          after: {
            dataSourceChangeDebounceTime: 'loadingData',
          },
        },
        loadingData: {
          invoke: {
            id: 'dataCollectorActor',
            src: 'collectData',
            input: ({ context }) => ({
              dataSource: context.dataSource,
              streamName: context.streamName,
            }),
            onSnapshot: {
              guard: {
                type: 'isValidData',
                params: ({ event }) => ({ data: event.snapshot.context }),
              },
              target: 'idle',
              actions: [
                {
                  type: 'storeData',
                  params: ({ event }) => ({ data: event.snapshot.context ?? [] }),
                },
                { type: 'notifyParent', params: { eventType: 'dataSource.dataChange' } },
              ],
            },
            onError: {
              target: 'idle',
              actions: [
                { type: 'storeData', params: () => ({ data: [] }) },
                { type: 'notifyParent', params: { eventType: 'dataSource.dataChange' } },
                { type: 'notifyDataCollectionFailure' },
              ],
            },
          },
        },
      },
    },
    disabled: {},
    deleted: {
      id: 'deleted',
      type: 'final',
      entry: [{ type: 'notifyParent', params: { eventType: 'dataSource.delete' } }],
    },
  },
});

export const createDataSourceMachineImplementations = ({
  data,
  toasts,
}: DataSourceMachineDeps): MachineImplementationsFrom<typeof dataSourceMachine> => ({
  actors: {
    collectData: createDataCollectorActor({ data }),
  },
  actions: {
    notifyDataCollectionFailure: createDataCollectionFailureNofitier({ toasts }),
  },
});
