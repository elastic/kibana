/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  MachineImplementationsFrom,
  assign,
  forwardTo,
  not,
  setup,
  sendTo,
  stopChild,
  and,
  ActorRefFrom,
  raise,
  cancel,
} from 'xstate5';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import { isRootStreamDefinition, Streams } from '@kbn/streams-schema';
import { htmlIdGenerator } from '@elastic/eui';
import { GrokCollection } from '@kbn/grok-ui';
import { EnrichmentDataSource, EnrichmentUrlState } from '../../../../../../common/url_schema';
import {
  StreamEnrichmentContextType,
  StreamEnrichmentEvent,
  StreamEnrichmentInput,
  StreamEnrichmentServiceDependencies,
} from './types';
import { isGrokProcessor, processorConverter } from '../../utils';
import {
  createUpsertStreamActor,
  createUpsertStreamFailureNofitier,
  createUpsertStreamSuccessNofitier,
} from './upsert_stream_actor';

import { ProcessorDefinitionWithUIAttributes } from '../../types';
import {
  simulationMachine,
  createSimulationMachineImplementations,
} from '../simulation_state_machine';
import { processorMachine, ProcessorActorRef } from '../processor_state_machine';
import {
  defaultEnrichmentUrlState,
  getConfiguredProcessors,
  getDataSourcesSamples,
  getDataSourcesUrlState,
  getStagedProcessors,
  getUpsertFields,
  spawnDataSource,
} from './utils';
import { createUrlInitializerActor, createUrlSyncAction } from './url_state_actor';
import {
  createDataSourceMachineImplementations,
  dataSourceMachine,
} from '../data_source_state_machine';
import { setupGrokCollectionActor } from './setup_grok_collection_actor';

const createId = htmlIdGenerator();

export type StreamEnrichmentActorRef = ActorRefFrom<typeof streamEnrichmentMachine>;

export const streamEnrichmentMachine = setup({
  types: {
    input: {} as StreamEnrichmentInput,
    context: {} as StreamEnrichmentContextType,
    events: {} as StreamEnrichmentEvent,
  },
  actors: {
    initializeUrl: getPlaceholderFor(createUrlInitializerActor),
    upsertStream: getPlaceholderFor(createUpsertStreamActor),
    dataSourceMachine: getPlaceholderFor(() => dataSourceMachine),
    setupGrokCollection: getPlaceholderFor(setupGrokCollectionActor),
    processorMachine: getPlaceholderFor(() => processorMachine),
    simulationMachine: getPlaceholderFor(() => simulationMachine),
  },
  actions: {
    spawnSimulationMachine: assign(({ context, spawn }) => ({
      simulatorRef:
        context.simulatorRef ||
        spawn('simulationMachine', {
          id: 'simulator',
          input: {
            processors: getStagedProcessors(context),
            streamName: context.definition.stream.name,
          },
        }),
    })),
    notifyUpsertStreamSuccess: getPlaceholderFor(createUpsertStreamSuccessNofitier),
    notifyUpsertStreamFailure: getPlaceholderFor(createUpsertStreamFailureNofitier),
    refreshDefinition: () => {},
    /* URL state actions */
    storeUrlState: assign((_, params: { urlState: EnrichmentUrlState }) => ({
      urlState: params.urlState,
    })),
    syncUrlState: getPlaceholderFor(createUrlSyncAction),
    storeDefinition: assign((_, params: { definition: Streams.ingest.all.GetResponse }) => ({
      definition: params.definition,
    })),
    /* Processors actions */
    setupProcessors: assign(({ context, self, spawn }) => {
      // Clean-up pre-existing processors
      context.processorsRefs.forEach(stopChild);
      // Setup processors from the stream definition
      const processorsRefs = context.definition.stream.ingest.processing.map((proc) => {
        const processor = processorConverter.toUIDefinition(proc);
        return spawn('processorMachine', {
          id: processor.id,
          input: {
            parentRef: self,
            processor,
          },
        });
      });

      return {
        initialProcessorsRefs: processorsRefs,
        processorsRefs,
      };
    }),
    addProcessor: assign(
      (
        { context, spawn, self },
        { processor }: { processor: ProcessorDefinitionWithUIAttributes }
      ) => {
        const id = createId();
        return {
          processorsRefs: context.processorsRefs.concat(
            spawn('processorMachine', {
              id,
              input: {
                parentRef: self,
                processor: { ...processor, id },
                isNew: true,
              },
            })
          ),
        };
      }
    ),
    deleteProcessor: assign(({ context }, params: { id: string }) => ({
      processorsRefs: context.processorsRefs.filter((proc) => proc.id !== params.id),
    })),
    reorderProcessors: assign((_, params: { processorsRefs: ProcessorActorRef[] }) => ({
      processorsRefs: params.processorsRefs,
    })),
    reassignProcessors: assign(({ context }) => ({
      processorsRefs: [...context.processorsRefs],
    })),
    /* Data sources actions */
    setupDataSources: assign((assignArgs) => ({
      dataSourcesRefs: assignArgs.context.urlState.dataSources.map((dataSource) =>
        spawnDataSource(dataSource, assignArgs)
      ),
    })),
    addDataSource: assign((assignArgs, { dataSource }: { dataSource: EnrichmentDataSource }) => {
      const newDataSourceRef = spawnDataSource(dataSource, assignArgs);

      return {
        dataSourcesRefs: [newDataSourceRef, ...assignArgs.context.dataSourcesRefs],
      };
    }),
    deleteDataSource: assign(({ context }, params: { id: string }) => ({
      dataSourcesRefs: context.dataSourcesRefs.filter((proc) => proc.id !== params.id),
    })),
    refreshDataSources: ({ context }) => {
      context.dataSourcesRefs.forEach((dataSourceRef) =>
        dataSourceRef.send({ type: 'dataSource.refresh' })
      );
    },
    sendProcessorsEventToSimulator: sendTo(
      'simulator',
      ({ context }, params: { type: StreamEnrichmentEvent['type'] }) => ({
        type: params.type,
        processors: getStagedProcessors(context),
      })
    ),
    sendDataSourcesSamplesToSimulator: sendTo(
      'simulator',
      ({ context }) => ({
        type: 'simulation.receive_samples',
        samples: getDataSourcesSamples(context),
      }),
      { delay: 800, id: 'send-samples-to-simulator' }
    ),
    sendResetEventToSimulator: sendTo('simulator', { type: 'simulation.reset' }),
    updateGrokCollectionCustomPatterns: assign(({ context }, params: { id: string }) => {
      const processorRefContext = context.processorsRefs
        .find((p) => p.id === params.id)
        ?.getSnapshot().context;
      if (processorRefContext && isGrokProcessor(processorRefContext.processor)) {
        context.grokCollection.setCustomPatterns(
          processorRefContext.processor.grok.pattern_definitions ?? {}
        );
      }
      return { grokCollection: context.grokCollection };
    }),
  },
  guards: {
    hasMultipleProcessors: ({ context }) => context.processorsRefs.length > 1,
    hasStagedChanges: ({ context }) => {
      const { initialProcessorsRefs, processorsRefs } = context;
      return (
        // Deleted processors
        initialProcessorsRefs.length !== processorsRefs.length ||
        // New/updated processors
        processorsRefs.some((processorRef) => {
          const state = processorRef.getSnapshot();
          return state.matches('configured') && state.context.isUpdated;
        }) ||
        // Processor order changed
        processorsRefs.some(
          (processorRef, pos) => initialProcessorsRefs[pos]?.id !== processorRef.id
        )
      );
    },
    hasPendingDraft: ({ context }) =>
      Boolean(context.processorsRefs.find((p) => p.getSnapshot().matches('draft'))),
    '!hasPendingDraft': not('hasPendingDraft'),
    canUpdateStream: and(['hasStagedChanges', '!hasPendingDraft']),
    isStagedProcessor: ({ context }, params: { id: string }) => {
      const processorRef = context.processorsRefs.find((p) => p.id === params.id);

      if (!processorRef) return false;
      return processorRef.getSnapshot().context.isNew;
    },
    isDraftProcessor: ({ context }, params: { id: string }) => {
      const processorRef = context.processorsRefs.find((p) => p.id === params.id);

      if (!processorRef) return false;
      return processorRef.getSnapshot().matches('draft');
    },
    isRootStream: ({ context }) => isRootStreamDefinition(context.definition.stream),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5RgHYCcCWBjAFgZQBc0wBDAWwDoMUMCMSAbDAL2qkOPIGIBtABgC6iUAAcA9rFoYxKYSAAeiALQB2PgDYKAJgCMATnXqV6rQFYt6gMw6ANCACeyvXpXa1AFh1qV7gBy+tLQBfILtUTFwOUkpqKUYWNijuHh0hJBBxSToZOUUEJXVfV2dLPj13Sz0dSp1TO0d8vQsKXy8td3ctMqKVFRCw9Gx8ImiqGjp41hQoADE0MTIAVTQGLgBXFbG4pmZIfjTRCSkc9LyCvT4KdSbrPj9C3xN65R93FvVTS3U+FUstUr0-XAg0iI3IFFgYAIaxEAHF5gBrADCYgYDDAWGyKC4EBkYDGADcxAj8ZDoXDESi0Risfs5JljrJTspKlormVOi5dLUXM98qYDBQ9KZ3GVTHxTB8-jogeEhklKGSYfDiVT0ZjpNiwGh5mgKCIGCQCAAzMRoRVQ5WU1Hq2mCelHLG5ZSilp8PhFLRNDl8Cx1BwvDRCnS6QouCU6O6ykHDTiUTgQexcWBg+MYsAYAl7e3pBlO5kIQw6CjucwBdxGPg6HSePmqawUSz+FSmLxN8qVaMRWOjBP2CGpqgQdHJwfEMl03OOzXOhDlPQUd3i4XqHm+dx8prFdcGFy+Swtnxd+Vj0iJgdxocjlOXmEQI1gSeHLIzgtKfwL0qt3zunwS-d8tWWi+BQvQVl4xgSoY6jHqCl59heox3kabA4nihLEviMKQmgBAKgAgpiZpPhk04nKAZySpcFg1BofBfP8KiAWUlgtLoVHiiKEGwT24IITeSEiPedDTFw2q6vqhommalDYdqeGpoRBDETmz6MrOSjWCBFYfJKVQGEY6iAZGrheiovgGK8nxRqEwLdgqFAIXKuBkKgBDrJssD2CgWAkXmr4UYgAQgVoKhdIU7iWWFm6seYIpehUHrXF4PEOU5MauSg7nCSQeBiBsWD4rgJDTI+qmkS+5EKEFZRCuUwXugE5RaHWFZChKoq1GYFS6Klp4kOezk4Jl2VGrl+VoIVFA5UiOAlTAflkUygUIMYbKFIEooqCGrZ6L4dbhVcFZlLpJitBWfXwWe-ZDSN00YLABokPYiQYGQaxSZqXAiPMhWwLAZqwBQA0QItlXLdVCCWF8VztOKniRntul8sYbqhRKTZdJUBiXb210ULdbn3Y9hovdMeBvR9KEyN9v1wADaBA8QZoQNqYPqQWpSuP4q7XKK3yPBuAYIKFmjev4pbmfR6juLjfH44TWXE09ZPsJTn00z9Yh-QzFDFaV7P5it1iseZvimHpagHk8wtKIKwo6d0Fg-h8ctpgNN0ZUTEAPSrr3vRr2JazrZp63NBupA64OztWxbXMBJ06Od-iWAdMORc15Qy62+iWG7jkK17Ss+yTz3+1TWK09r9Oh6z6IEGVBwVRzK1KLorFVpYHQhjofPtAdVglnF-iRnc9EWPn6XdndJd++T6vU0HdP-aHKYkAt5X+VVlFdBQsc-I8ljw02B2RUKkHuGolkhsBk+F9P3u+6T5eB1XId6shDeGwFkPvtDQpdArF0TiVgjK23aAuFw3wPTmThsYO+HsCZFwIMrZ+88A6L2TAvLEBdjTjhwN-beiBAhCjOtYAwDEQzrj5F3EC9UDwVF6AEWopgEGDWQagsu6CK6agoASDAYAADuAARMaAAFYg-ChFYIwTgqRIioQ0kgDMARDAICwEIRDSi5gKCfC9BcX0JgLh6EAl6c+5txR3DUMBPQedbJDTSvfIYM8n5cLVrI3h8jREEBIBIsA8iZE8JkGHeaYA-FeO1rAFRDAG5oE0RpfcphGw-DUOuJO5sVAmOFs0X08V9wm1KPROxAx7L9XYQ-YurjVYUw8cErxijMTKNUeowJgc+ECJEeIyRHT4lvgtsUSKIYwodQ0P6Bo+gQq6Eih0ecR9ehsM9hUlBs80HuKCSgdpQjhENIbhAFRYA1GwFaYvCgxpmlAwAFS9JWpGUCmSZaikCJKcUhhmKuHdPoXo5glwQIWUgpZFAyAlXXmwbx40CpwD1gwCQkAcRjTyhCoGYgRCoAALLApgCNa5v98m6PbkUa4B4NCp2FtM7QtRD7CjNvRWW9iYyOMQYrFBQKUAgumGChFk1IXItQHCnxnK-pQphei1lmK3LYsop0PeR8LKSlXPRcwfIyXsUpaYalXc-lMsBRi0F8KJqCp5diHKArIUgwlS8MKjZahGF+CkmlfIzolkyeUToXpqzm01RwllbKoAcv1dylFRq9UQumgcxR5r+S90XJ4PwndSidBJQ0EwSSj61FdeBfJIRbIoDEKzeA6QHGpiji3X+kZ-5fiTr+UUpgAh1kjP4Nw9FD6BEqEUfOsQJg7ESEWqc0c3x7WLGURG7R-jQyrHWZwC5vmVC+MYUsZh23jHoF26YcwFjLAYMWo2v9UklgsNcKwYV-hJzrI8S4wprUsWmRdOlpTLxKgpKqG0NIf5by0S6Fse8ih6Uir0YCxg6y-GLFUJ5-xjE-hlLek8l4oDWmpBqGQMwSAYAYBsMAW6f55BHaBG4vcDwiisUxW2u7PCBDuP4LoJkFkYaIY0c2yTvxVv-Im5QOch5mBNjLVcSM-kCXIDR99jQDwMcrT8atAFha2JAn8NQhLGoPN44ODAw50O9pLWcKwlxIqFF7sKMjvdmJmDYt4bj21dCAig3BPGiC+OySEihaYAmNIfE0GYaorw9xeFMRbFoPULhDPaPuT1SynP9obFzVJnh-BqqyQ0TS4ohRxXnAZb4rtLO8XduU5xj9S7VOwa+paCT9zJN6B6KLGTYvKHrU60srQDx7U8NtYL2XKm5ZficrxXT-EdNC63XomgWyrmhuZaoBgWrCxDJA8yFt3SX19BZYpdloPWayy5HLc81ltPqQ3Rpezzm9d-k8xsNbgKBCMBAsZiBJvmJm1Y+bfR0sMtW8NIm3qoC6v5f6-Nalt1nBHni6oBLbGyZY1DUKLRe75MPQEL4zW1tKzex98FXKgZYGhZCCAB3KIuEXO6D4FkygXEuwgTwKbe7XAyT4CwD2SnLfloyr1Or2XBpRxQQ1WPWNVD3l6NVooqhqBDHySUbwWzaaMNWZwNladWflgDBgWYIAACUxBiAUnGDn+RKiXBFAYLwVYXag6UKPS4pWmy+jCntT4WaghAA */
  id: 'enrichStream',
  context: ({ input }) => ({
    definition: input.definition,
    dataSourcesRefs: [],
    grokCollection: new GrokCollection(),
    initialProcessorsRefs: [],
    processorsRefs: [],
    urlState: defaultEnrichmentUrlState,
  }),
  initial: 'initializingStream',
  states: {
    initializingStream: {
      always: [
        { target: 'resolvedRootStream', guard: 'isRootStream' },
        { target: 'initializingFromUrl' },
      ],
    },
    initializingFromUrl: {
      invoke: {
        src: 'initializeUrl',
      },
      on: {
        'url.initialized': {
          actions: [
            { type: 'storeUrlState', params: ({ event }) => event },
            { type: 'syncUrlState' },
          ],
          target: 'setupGrokCollection',
        },
      },
    },
    setupGrokCollection: {
      invoke: {
        id: 'setupGrokCollection',
        src: 'setupGrokCollection',
        input: ({ context }) => ({
          grokCollection: context.grokCollection,
        }),
        onDone: 'ready',
        onError: 'grokCollectionFailure',
      },
    },
    grokCollectionFailure: {},
    ready: {
      id: 'ready',
      type: 'parallel',
      entry: [{ type: 'setupProcessors' }, { type: 'setupDataSources' }],
      on: {
        'stream.received': {
          target: '#ready',
          actions: [{ type: 'storeDefinition', params: ({ event }) => event }],
          reenter: true,
        },
      },
      states: {
        stream: {
          initial: 'idle',
          states: {
            idle: {
              on: {
                'stream.reset': {
                  guard: 'hasStagedChanges',
                  target: '#ready',
                  actions: [{ type: 'sendResetEventToSimulator' }],
                  reenter: true,
                },
                'stream.update': {
                  guard: 'canUpdateStream',
                  actions: [raise({ type: 'simulation.viewDataPreview' })],
                  target: 'updating',
                },
              },
            },
            updating: {
              invoke: {
                id: 'upsertStreamActor',
                src: 'upsertStream',
                input: ({ context }) => ({
                  definition: context.definition,
                  processors: getConfiguredProcessors(context),
                  fields: getUpsertFields(context),
                }),
                onDone: {
                  target: 'idle',
                  actions: [
                    { type: 'sendResetEventToSimulator' },
                    { type: 'notifyUpsertStreamSuccess' },
                    { type: 'refreshDefinition' },
                  ],
                },
                onError: {
                  target: 'idle',
                  actions: [{ type: 'notifyUpsertStreamFailure' }],
                },
              },
            },
          },
        },
        enrichment: {
          type: 'parallel',
          on: {
            'url.sync': {
              actions: [
                {
                  type: 'storeUrlState',
                  params: ({ context }) => ({
                    urlState: { v: 1, dataSources: getDataSourcesUrlState(context) },
                  }),
                },
                { type: 'syncUrlState' },
              ],
            },
            'dataSource.change': {
              actions: raise({ type: 'url.sync' }),
            },
            'dataSource.dataChange': {
              actions: [
                cancel('send-samples-to-simulator'), // Debounce samples sent to simulator on multiple data sources retrieval
                { type: 'sendDataSourcesSamplesToSimulator' },
              ],
            },
          },
          states: {
            displayingSimulation: {
              initial: 'viewDataPreview',
              entry: [{ type: 'spawnSimulationMachine' }],
              on: {
                'processors.add': {
                  guard: '!hasPendingDraft',
                  actions: [
                    { type: 'addProcessor', params: ({ event }) => event },
                    { type: 'sendProcessorsEventToSimulator', params: ({ event }) => event },
                  ],
                },
                'processors.reorder': {
                  guard: 'hasMultipleProcessors',
                  actions: [
                    { type: 'reorderProcessors', params: ({ event }) => event },
                    { type: 'sendProcessorsEventToSimulator', params: ({ event }) => event },
                  ],
                },
                'processor.change': [
                  {
                    guard: { type: 'isStagedProcessor', params: ({ event }) => event },
                    actions: [
                      { type: 'sendProcessorsEventToSimulator', params: ({ event }) => event },
                    ],
                  },
                  {
                    guard: { type: 'isDraftProcessor', params: ({ event }) => event },
                    actions: [
                      {
                        type: 'updateGrokCollectionCustomPatterns',
                        params: ({ event }) => event,
                      },
                      { type: 'sendProcessorsEventToSimulator', params: ({ event }) => event },
                    ],
                  },
                ],
                'processor.delete': {
                  actions: [
                    stopChild(({ event }) => event.id),
                    { type: 'deleteProcessor', params: ({ event }) => event },
                    { type: 'sendProcessorsEventToSimulator', params: ({ event }) => event },
                  ],
                },
                'processor.stage': {
                  actions: [
                    { type: 'reassignProcessors' },
                    { type: 'sendProcessorsEventToSimulator', params: ({ event }) => event },
                  ],
                },
                'processor.update': {
                  actions: [
                    { type: 'reassignProcessors' },
                    { type: 'sendProcessorsEventToSimulator', params: ({ event }) => event },
                  ],
                },
                'simulation.refresh': {
                  actions: [{ type: 'refreshDataSources' }],
                },
              },
              states: {
                viewDataPreview: {
                  on: {
                    'simulation.viewDetectedFields': 'viewDetectedFields',
                    'simulation.changePreviewDocsFilter': {
                      actions: forwardTo('simulator'),
                    },
                    'previewColumns.*': {
                      actions: forwardTo('simulator'),
                    },
                  },
                },
                viewDetectedFields: {
                  on: {
                    'simulation.viewDataPreview': 'viewDataPreview',
                    'simulation.fields.*': {
                      actions: forwardTo('simulator'),
                    },
                  },
                },
              },
            },
            managingDataSources: {
              initial: 'closed',
              states: {
                closed: {
                  on: {
                    'dataSources.openManagement': 'open',
                  },
                },
                open: {
                  on: {
                    'dataSources.closeManagement': 'closed',
                    'dataSources.add': {
                      actions: [
                        { type: 'addDataSource', params: ({ event }) => event },
                        raise({ type: 'url.sync' }),
                      ],
                    },
                    'dataSource.delete': {
                      actions: [
                        stopChild(({ event }) => event.id),
                        { type: 'deleteDataSource', params: ({ event }) => event },
                        raise({ type: 'url.sync' }),
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    resolvedRootStream: {
      type: 'final',
    },
  },
});

export const createStreamEnrichmentMachineImplementations = ({
  refreshDefinition,
  streamsRepositoryClient,
  core,
  data,
  urlStateStorageContainer,
}: StreamEnrichmentServiceDependencies): MachineImplementationsFrom<
  typeof streamEnrichmentMachine
> => ({
  actors: {
    initializeUrl: createUrlInitializerActor({ core, urlStateStorageContainer }),
    upsertStream: createUpsertStreamActor({ streamsRepositoryClient }),
    setupGrokCollection: setupGrokCollectionActor(),
    processorMachine,
    dataSourceMachine: dataSourceMachine.provide(
      createDataSourceMachineImplementations({ data, toasts: core.notifications.toasts })
    ),
    simulationMachine: simulationMachine.provide(
      createSimulationMachineImplementations({
        data,
        streamsRepositoryClient,
        toasts: core.notifications.toasts,
      })
    ),
  },
  actions: {
    refreshDefinition,
    syncUrlState: createUrlSyncAction({ urlStateStorageContainer }),
    notifyUpsertStreamSuccess: createUpsertStreamSuccessNofitier({
      toasts: core.notifications.toasts,
    }),
    notifyUpsertStreamFailure: createUpsertStreamFailureNofitier({
      toasts: core.notifications.toasts,
    }),
  },
});
