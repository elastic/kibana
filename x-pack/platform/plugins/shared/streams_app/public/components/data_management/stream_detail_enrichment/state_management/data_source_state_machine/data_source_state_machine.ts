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
  assign,
  sendTo,
  setup,
} from 'xstate5';
import { Condition, SampleDocument } from '@kbn/streams-schema';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import {
  DataSourceInput,
  DataSourceContext,
  DataSourceEvent,
  DataSourceMachineDeps,
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
        dataSource: {
          ...params.dataSource,
          id: context.dataSource.id,
        },
      })
    ),
    storeCondition: assign((_, params: { condition: Condition }) => ({
      condition: params.condition,
    })),
    storeData: assign((_, params: { data: SampleDocument[] }) => ({
      data: params.data,
    })),
    resetToPrevious: assign(({ context }) => ({
      dataSource: context.previousDataSource,
    })),
    notifyChangeEventToParent: sendTo(
      ({ context }) => context.parentRef,
      ({ context }) => ({ type: 'dataSource.change', id: context.dataSource.id })
    ),
    notifyDataLoadedToParent: sendTo(
      ({ context }) => context.parentRef,
      ({ context }) => ({ type: 'dataSource.loaded', id: context.dataSource.id })
    ),
    notifyDeleteEventToParent: sendTo(
      ({ context }) => context.parentRef,
      ({ context }) => ({ type: 'dataSource.delete', id: context.dataSource.id })
    ),
  },
  guards: {
    isEnabled: ({ context }) => context.dataSource.enabled,
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QQIYBcUGUD2BXATgMZgB0uAdvnNgDYBukAxANoAMAuoqAA7awCWaftnJcQAD0QAmABwBGEqwBsAdgCsATgAsW1nJmsVSrQBoQAT0RyNSkip1brGgMxaVzmWq0Bfb2dQYOATEZJTU9EzMcpxIILwCQiJikghqzhqKrGpyanrKKjLuZpYI1rb2Ok6u7p4+fiABWHhEpGDkKABGNEyNQS0kaNhQUN0AgoRCdILmbDE8fILCorEpGu6KGtkuzvbKssWISnokckcyzs5KO1rOUs6+-uhNwa3tXT1PfSGEABYo5DBZmJ4oskitEDItHYZFIlEocqwpLDDKYLIgNBpWCQXGp5BpYXJbpcHg1Ps0Qm1Ot0ICR+BBuoxeuTSL9-oCOMCFollqAUrsTq4cioVKxnHp9mjSvo1CQZHKNDJMaKpCo1iSmS8SJT3jSIGAOnhyIR+ACAMJ-AFwRlkzWsy1A2Ig7nJKyimVKGzGCqsTaig4IfEytSaVyqeFwtRKdU2-ra6kkPUGijGs0WmCwRjiWAYNCkFAAM1z+AAFBqWua2WAACL6w3EAAq-AAtmAAJTWwLMrVveOJusmqAVy2wB3zBJLF0IfmExxqYWi8Uyf1yLJQuF3GGQrRKJFSaOdzVxyAkGjYFAQAdVp6MMD4fDYfAkbg0dD5h9NhNPU20boTB-jQZ8FHOIuQncEEEcDIIy0NQpBgwxWB0Zc5HWDQ5DuYxzhFLw93qMsQgvWAqQ+A9+kGYYxgmfgpjQGYOUdUCwV5Q41mxVU9C0GxYM0f0jgUU5WBkD14RyZxsl8epyGwPV4FifCwE5ccmIkRAAFo5AUKQUIuSE1ncfErn9ITZXcVxdAMAzrH3Z5+goKhYFoBgIEU0EeRUiCpGXewSB2C5OK0WF8XsKM8JjCke0gFznXAy5oVheFciRI57CMjxFBDTjNhcJE6keUjwuImk6W6KKwOYhAlEjEgrkcbcd19JRlykH0fMq2C4IS-RrK+V5CoTWtkwHId01K5SUhXGCSE44LVRuU4FWXLIZBIbIMM2U5ZGFbquyPGlT3PS8nlGtyUkhOK4QRJKUWQj1sS0OVVUjAoYW2zVCMK47J3sDJdFuPQUJsNC5H9KR8TsXRt0VUH-LVCSgA */
  id: 'dataSource',
  context: ({ input }) => ({
    parentRef: input.parentRef,
    previousDataSource: input.dataSource,
    dataSource: input.dataSource,
    streamName: input.streamName,
    condition: input.condition,
    data: [],
  }),
  initial: 'unresolved',
  on: {
    'dataSource.delete': {
      guard: ({ context }) => context.dataSource.type !== 'random-samples', // We don't allow deleting the random-sample source to always have a data source available
      target: '.deleted',
    },
    'dataSource.receive_condition': {
      actions: [{ type: 'storeCondition', params: ({ event }) => event }],
    },
  },
  states: {
    unresolved: {
      always: [{ target: 'enabled', guard: 'isEnabled' }, { target: 'disabled' }],
    },
    enabled: {
      initial: 'loadingData',
      on: {
        'dataSource.toggleActivity': {
          target: 'disabled',
          actions: [
            { type: 'notifyChangeEventToParent' },
            {
              type: 'storeDataSource',
              params: ({ context }) => ({ dataSource: { ...context.dataSource, enabled: false } }),
            },
          ],
        },
        'dataSource.change': {
          target: '.debouncingChanges',
          actions: [
            { type: 'storeDataSource', params: ({ event }) => event },
            { type: 'notifyChangeEventToParent' },
          ],
        },
        'dataSource.receive_condition': '.loadingData',
        'dataSource.refresh': '.loadingData',
      },
      exit: [{ type: 'storeData', params: () => ({ data: [] }) }],
      states: {
        idle: {
          on: {
            'dataSource.change': {
              target: 'debouncingChanges',
              actions: [
                { type: 'storeDataSource', params: ({ event }) => event },
                { type: 'notifyChangeEventToParent' },
              ],
            },
          },
        },
        debouncingChanges: {
          on: {
            'dataSource.change': {
              target: 'debouncingChanges',
              actions: [
                { type: 'storeDataSource', params: ({ event }) => event },
                { type: 'notifyChangeEventToParent' },
              ],
              description: 'Re-enter debouncing state.',
              reenter: true,
            },
          },
          after: {
            dataSourceChangeDebounceTime: {
              target: 'loadingData',
            },
          },
        },
        loadingData: {
          invoke: {
            id: 'dataCollectorActor',
            src: 'collectData',
            input: ({ context }) => ({
              condition: context.condition,
              dataSource: context.dataSource,
              streamName: context.streamName,
            }),
            onSnapshot: [
              {
                guard: ({ event }) => event.snapshot.context === undefined,
              },
              {
                target: 'idle',
                actions: [
                  {
                    type: 'storeData',
                    params: ({ event }) => ({ data: event.snapshot.context ?? [] }),
                  },
                  { type: 'notifyDataLoadedToParent' },
                ],
              },
            ],
            onError: {
              target: 'idle',
              actions: [
                { type: 'storeData', params: () => ({ data: [] }) },
                { type: 'notifyDataLoadedToParent' },
                { type: 'notifyDataCollectionFailure' },
              ],
            },
          },
        },
      },
    },
    disabled: {
      on: {
        'dataSource.toggleActivity': {
          target: 'enabled',
          actions: [
            { type: 'notifyChangeEventToParent' },
            {
              type: 'storeDataSource',
              params: ({ context }) => ({ dataSource: { ...context.dataSource, enabled: true } }),
            },
          ],
        },
      },
    },
    deleted: {
      id: 'deleted',
      type: 'final',
      entry: [{ type: 'notifyDeleteEventToParent' }],
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
