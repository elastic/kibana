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
  /** @xstate-layout N4IgpgJg5mDOIC5QQIYBcUGUD2BXATgMZgDEqGOBxAdBGADZhpgDaADALqKgAO2sASzQDsAO24gAHogBMAVjnUALAA4AbPLkqAjNqVK1KmQBoQAT0QB2agE45N1XJlsbNte7baAvl9PkseESk-pRB1GjYUFCMAIKEwgBuQmbsXEggfILCYhLSCEZK1NoazgDMTtqlNpWmFgi6bNRq2jKlKnKlpWyWamzyPn7oAVTBQ6E0EVGx8QJJaCnaabz8QiLi6XktSopKnnYqSlUq7bWIDU0tbR1dPX1yAyAhgTR0zPgAtgKiX1AkqRKZVY5DaIUraahgmQ6dQqGyWbTtSyneqHJoOGQyJSWNhqSxglSlB5PEa0JhgD5fH5-RYAlbZdagPIyNxNWGwyz6GzlLHIvSlNFKDFYnF4hGE3yPMbPMDUMCiFAAI0YEDIUpJhAAFihRDB-ulAfTcoh9LZdO5SoZ1FpDMjdoVDAo2Ls5LioeLBhRpbL5UrIKSFXhRIQfgBhLU6uAkSSwDDMagoABmbwAFMSgmHtTAACJgAO4INgAAqAneYAAlKrPSS5Yrlf7A8GdRmI7A9cssmsjQglDYZNQcZ42mVdnjbYKmm1mtoOdPXO7JVWwjXfRBqPRsCgID8s0MSOT8Nh8NQePR0AnD+9aEMQ9h6Ix4oe4hF8G2MnTOyD6i0VLZMWx7K0Fr2MiVT8s4sLdNoNhsGCehKD4EqiNgdDwOkabELSHbAoyiAALRyOCbDHJ0aiwaUSiVCY5h4So1g4kYCjbGwMFqDYRJqmErzkp83w6phQIMlIoKNGCnRVPI3RqIcpTItYdgOGoLpwrCGIyJY7GLjQy7Kvxhqfrh-JEQSFpkRRpQYnIyLyD+2LHL0alScxbESuhMraX6AgQIwukfjh9TlDYygcvIPTaDiVF1Po4Kke0sU2CoA5yOpLkcVpPp1nQeZBqG4YwKh7YCV2ULWNoHTtAolhyIK5RqGO0VXHFCW9AYGnDEu6V+uum7bkMPnYUJCCWL2TQYris6kXCEXGgiRSTgiRHmbR8EpZpMpbrAtaQH1gl5B0jSGD0JE9liU0ouC+iChNsKCnorXjGtDBkhA21dgBELdPFBKtM4WjIo0hzTgoVUDm4egcghXhAA */
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
              guard: ({ event }) => Array.isArray(event.snapshot.context),
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
