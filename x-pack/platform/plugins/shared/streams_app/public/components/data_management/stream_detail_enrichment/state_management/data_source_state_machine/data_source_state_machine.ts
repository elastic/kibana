/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ActorRefFrom, MachineImplementationsFrom, SnapshotFrom } from 'xstate';
import { and, assertEvent, assign, sendTo, setup } from 'xstate';
import type { SampleDocument } from '@kbn/streams-schema';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import { isEqual, omit } from 'lodash';
import { useSelector } from '@xstate/react';
import type {
  DataSourceInput,
  DataSourceContext,
  DataSourceEvent,
  DataSourceMachineDeps,
  DataSourceToParentEvent,
  DataSourceSimulationMode,
} from './types';
import {
  createDataCollectionFailureNotifier,
  createDataCollectorActor,
} from './data_collector_actor';
import type { EnrichmentDataSourceWithUIAttributes } from '../../types';

export type DataSourceActorRef = ActorRefFrom<typeof dataSourceMachine>;
export type DataSourceActorSnapshot = SnapshotFrom<typeof dataSourceMachine>;

export const useDataSourceSelector = useSelector;

export const dataSourceMachine = setup({
  types: {
    input: {} as DataSourceInput,
    context: {} as DataSourceContext,
    events: {} as DataSourceEvent,
  },
  actors: {
    collectData: getPlaceholderFor(createDataCollectorActor),
  },
  actions: {
    notifyDataCollectionFailure: getPlaceholderFor(createDataCollectionFailureNotifier),
    restorePersistedCustomSamplesDocuments: assign(({ context }) => {
      if (context.dataSource.type === 'custom-samples' && context.dataSource.storageKey) {
        const dataSource = sessionStorage.getItem(context.dataSource.storageKey);
        if (dataSource) {
          return {
            dataSource: {
              ...context.dataSource,
              documents: JSON.parse(dataSource).documents,
            },
          };
        }
      }
      return {};
    }),
    updatePersistedCustomSamplesDocuments: assign(({ context }) => {
      if (context.dataSource.type === 'custom-samples' && context.dataSource.storageKey) {
        sessionStorage.setItem(context.dataSource.storageKey, JSON.stringify(context.dataSource));
      }
      return {};
    }),
    removePersistedCustomSamplesDocuments: assign(({ context }) => {
      if (context.dataSource.type === 'custom-samples' && context.dataSource.storageKey) {
        sessionStorage.removeItem(context.dataSource.storageKey);
      }
      return {};
    }),
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
  delays: {
    // Debounce delay for custom samples to avoid processing every keystroke
    customSamplesDebounce: 300,
  },
  guards: {
    isEnabled: ({ context }) => context.dataSource.enabled,
    isValidData: (_, params: { data?: SampleDocument[] }) => Array.isArray(params.data),
    isCustomSamples: ({ context }) => context.dataSource.type === 'custom-samples',
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
  /** @xstate-layout N4IgpgJg5mDOIC5QQIYBcUGUD2BXATgMZgB0EYaY+AtgJYB2DUAxANoAMAuoqAA7axaaWtno8QAD0QBaAIwAmEu1kAOAMzsAbLIDsAVnX75agDQgAnogM6SagJzLNmlXYAsRtQF9PZ1BhwExGQUVHSM9CysstxIIPyCwqLiUgiyziSyrirZdpp2eqp6Oq5mlggGmiQ6dvJ6blqaOuzy3r7oWHhEpGD0KABGADaQzH4dgaRo2FBQQwCChMIAbkLmHDF8AkIiYrEpdZWqafI6asdqeux6pYia7iTOddWushfydq0gowFdJD39QxARu1vkF8GAAGZg2AACzW4niWySu0Q+SUdh0TVc2hO7DsL2uCBcdhI+wK52Mb3ksg+X06QT+g2GtPGJEI0JQETAcNiCMSO1AKSxrgyeQcKiKJwuVwsKKaSip7Cyenkmj0zlcNOBdO6vUZgOZPzZHJgUXWcU2fOSiBcKhJpzU4tkdnUdWlZXR7HlskV4pVavFmv82t+uoBJAG2BQECYABF2swqPhsPgSLwBuhwcnqGR2gBhbADIYLZPzSb4bkbBLbK0IHS2716PRZfJUpwYgne1FNzs6PIaWReHyfLUs6Owf5Mkc-SbTOYLWjLNCrLjwi3V5EIDRqEmZPLPE54tQlGUIW42B7otwvZrvIcGoJjif6qcPsBDSgV81VpECqyabf5E8KhYgUFyyASBSKLkOjyG8zyvLeQ70Ng5DwLE95gKu378pIMhOCQjquBKbzKmovYEs8nryM8ThFG8djnERgZjD85CUDQDBMFhiI4Sk0h6CQrjsC4W6nLI4nKPIEGKrYW6NLUInHMxII6k+3GWhuci2oRxEtmRmgEioChorcmjsGoLwuHoynBgyYa0BAQzqeuv6pMqsl2G4REYmomjHB28jAfcVKXk4zSqjoNksnZkDhpG0YRHGGDOT+uEIG8GRKq4sGYr21EEs6UHFLo5KquqUWsbQ456ilvGIL525UoU7gvNemQQeKmXKER7C9ioVKDm0Qajm+IQQLVNbATY2V5GkrhZOcuQUeiVQ0b6lwuK4iGeEAA */
  id: 'dataSource',
  context: ({ input }) => ({
    parentRef: input.parentRef,
    data: [],
    dataSource: input.dataSource,
    streamName: input.streamName,
    streamType: input.streamType,
    simulationMode: getSimulationModeByDataSourceType(input.dataSource.type),
  }),
  initial: 'determining',
  states: {
    determining: {
      entry: [{ type: 'restorePersistedCustomSamplesDocuments' }],
      always: [{ target: 'enabled', guard: 'isEnabled' }, { target: 'disabled' }],
    },
    enabled: {
      initial: 'loadingData',
      on: {
        'dataSource.disable': {
          target: 'disabled',
          actions: [
            { type: 'toggleDataSourceActivity' },
            { type: 'updatePersistedCustomSamplesDocuments' },
            { type: 'notifyParent', params: { eventType: 'dataSource.change' } },
          ],
        },
        'dataSource.refresh': { target: '.loadingData', reenter: true },
        'dataSource.change': [
          // For custom samples with substantive changes, debounce before collecting
          {
            guard: and(['shouldCollectData', 'isCustomSamples']),
            target: '.debouncingChange',
            reenter: true,
            actions: [{ type: 'storeDataSource', params: ({ event }) => event }],
          },
          // For other data sources with substantive changes, collect immediately
          {
            guard: 'shouldCollectData',
            target: '.loadingData',
            reenter: true,
            actions: [
              { type: 'storeDataSource', params: ({ event }) => event },
              { type: 'notifyParent', params: { eventType: 'dataSource.change' } },
            ],
          },
          // Cosmetic changes only (e.g., name updates)
          {
            actions: [
              { type: 'storeDataSource', params: ({ event }) => event },
              { type: 'notifyParent', params: { eventType: 'dataSource.change' } },
            ],
          },
        ],
      },
      states: {
        idle: {},
        // Debouncing state for custom samples - waits for typing to stop before processing
        debouncingChange: {
          after: {
            customSamplesDebounce: {
              target: 'loadingData',
              actions: [{ type: 'notifyParent', params: { eventType: 'dataSource.change' } }],
            },
          },
        },
        loadingData: {
          invoke: {
            id: 'dataCollectorActor',
            src: 'collectData',
            input: ({ context }) => ({
              dataSource: context.dataSource,
              streamName: context.streamName,
              streamType: context.streamType,
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
    disabled: {
      on: {
        'dataSource.enable': {
          target: 'enabled',
          actions: [
            { type: 'toggleDataSourceActivity' },
            { type: 'updatePersistedCustomSamplesDocuments' },
            { type: 'notifyParent', params: { eventType: 'dataSource.change' } },
          ],
        },
        'dataSource.change': {
          actions: [
            { type: 'storeDataSource', params: ({ event }) => event },
            { type: 'notifyParent', params: { eventType: 'dataSource.change' } },
          ],
        },
        'dataSource.delete': 'deleted',
      },
    },
    deleted: {
      id: 'deleted',
      type: 'final',
      entry: [
        { type: 'notifyParent', params: { eventType: 'dataSource.delete' } },
        { type: 'removePersistedCustomSamplesDocuments' },
      ],
    },
  },
});

export const createDataSourceMachineImplementations = ({
  data,
  toasts,
  telemetryClient,
  streamsRepositoryClient,
}: DataSourceMachineDeps): MachineImplementationsFrom<typeof dataSourceMachine> => ({
  actors: {
    collectData: createDataCollectorActor({ data, telemetryClient, streamsRepositoryClient }),
  },
  actions: {
    notifyDataCollectionFailure: createDataCollectionFailureNotifier({ toasts }),
  },
});

const getSimulationModeByDataSourceType = (
  dataSourceType: EnrichmentDataSourceWithUIAttributes['type']
): DataSourceSimulationMode => {
  switch (dataSourceType) {
    case 'latest-samples':
      return 'partial';
    case 'kql-samples':
      return 'partial';
    case 'custom-samples':
      return 'complete';
    case 'failure-store':
      return 'complete';
    default:
      throw new Error(`Invalid data source type: ${dataSourceType}`);
  }
};
