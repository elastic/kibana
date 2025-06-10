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
import { dataSourceConverter, isGrokProcessor, processorConverter } from '../../utils';
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
  getUpsertWiredFields,
} from './utils';
import { createUrlInitializerActor, createUrlUpdaterAction } from './url_state_actor';
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
    updateUrlState: getPlaceholderFor(createUrlUpdaterAction),
    notifyUpsertStreamSuccess: getPlaceholderFor(createUpsertStreamSuccessNofitier),
    notifyUpsertStreamFailure: getPlaceholderFor(createUpsertStreamFailureNofitier),
    refreshDefinition: () => {},
    storeDefinition: assign((_, params: { definition: Streams.ingest.all.GetResponse }) => ({
      definition: params.definition,
    })),

    stopProcessors: ({ context }) => context.processorsRefs.forEach(stopChild),
    setupProcessors: assign(
      ({ self, spawn }, params: { definition: Streams.ingest.all.GetResponse }) => {
        const processorsRefs = params.definition.stream.ingest.processing.map((proc) => {
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
      }
    ),
    setupDataSources: assign(({ context, self, spawn }) => {
      const dataSourcesRefs = context.urlState.dataSources.map((dataSource) => {
        const dataSourceWithUIAttributes = dataSourceConverter.toUIDefinition(dataSource);
        return spawn('dataSourceMachine', {
          id: dataSourceWithUIAttributes.id,
          input: {
            parentRef: self,
            streamName: context.definition.stream.name,
            dataSource: dataSourceWithUIAttributes,
          },
        });
      });

      return {
        dataSourcesRefs,
      };
    }),
    addDataSource: assign(
      ({ context, spawn, self }, { dataSource }: { dataSource: EnrichmentDataSource }) => {
        const dataSourceWithUIAttributes = dataSourceConverter.toUIDefinition(dataSource);
        const dataSourcesRefs = context.dataSourcesRefs.slice();

        dataSourcesRefs.unshift(
          spawn('dataSourceMachine', {
            id: dataSourceWithUIAttributes.id,
            input: {
              parentRef: self,
              streamName: context.definition.stream.name,
              dataSource: dataSourceWithUIAttributes,
            },
          })
        );

        return { dataSourcesRefs };
      }
    ),
    stopDataSource: stopChild((_, params: { id: string }) => params.id),
    deleteDataSource: assign(({ context }, params: { id: string }) => ({
      dataSourcesRefs: context.dataSourcesRefs.filter((proc) => proc.id !== params.id),
    })),
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
    stopProcessor: stopChild((_, params: { id: string }) => params.id),
    deleteProcessor: assign(({ context }, params: { id: string }) => ({
      processorsRefs: context.processorsRefs.filter((proc) => proc.id !== params.id),
    })),
    reorderProcessors: assign((_, params: { processorsRefs: ProcessorActorRef[] }) => ({
      processorsRefs: params.processorsRefs,
    })),
    reassignProcessors: assign(({ context }) => ({
      processorsRefs: [...context.processorsRefs],
    })),
    storeUrlState: assign((_, params: { urlState: EnrichmentUrlState }) => ({
      urlState: params.urlState,
    })),
    sendProcessorsEventToSimulator: sendTo(
      'simulator',
      ({ context }, params: { type: StreamEnrichmentEvent['type'] }) => ({
        type: params.type,
        processors: getStagedProcessors(context),
      })
    ),
    sendDataSourcesSamplesToSimulator: sendTo('simulator', ({ context }) => ({
      type: 'simulation.receive_samples',
      samples: getDataSourcesSamples(context),
    })),
    sendResetEventToSimulator: sendTo('simulator', { type: 'simulation.reset' }),
    updateGrokCollectionCustomPatterns: assign(({ context }, params: { id: string }) => {
      const processorRefContext = context.processorsRefs
        .find((p) => p.id === params.id)
        ?.getSnapshot().context;
      if (processorRefContext && isGrokProcessor(processorRefContext.processor)) {
        context.grokCollection.setCustomPatterns(
          processorRefContext?.processor.grok.pattern_definitions ?? {}
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
    isWiredStream: ({ context }) => Streams.WiredStream.GetResponse.is(context.definition),
  },
}).createMachine({
  /** @xstate-layout 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-btygS5KxgTzi4meWPTRHiok-GhdPaU8L57XDeSXPoIVN7b3GLvE+B84CAoUegpwTQ9bFFZiYNoWiqjajxKnBM8SjBkgMMkgiDAkQQAAEpiDEOeNkfLAm+ElIGWMjRPzBi+NgjxJJ8HBhcHKG4oC-BAA */
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
        {
          target: 'resolvedRootStream',
          guard: 'isRootStream',
        },
        { target: 'initializingFromUrl' },
      ],
    },
    initializingFromUrl: {
      invoke: {
        src: 'initializeUrl',
      },
      on: {
        'url.initialized': {
          target: 'setupGrokCollection',
          actions: [
            { type: 'storeUrlState', params: ({ event }) => event },
            { type: 'updateUrlState' },
          ],
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
        onDone: {
          target: 'ready',
        },
        onError: {
          target: 'grokCollectionFailure',
        },
      },
    },
    grokCollectionFailure: {},
    ready: {
      id: 'ready',
      type: 'parallel',
      entry: [
        { type: 'stopProcessors' },
        { type: 'setupProcessors', params: ({ context }) => ({ definition: context.definition }) },
        { type: 'setupDataSources' },
      ],
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
                  actions: [
                    { type: 'sendResetEventToSimulator' },
                    raise({ type: 'simulation.viewDataPreview' }),
                  ],
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
                  fields: getUpsertWiredFields(context),
                }),
                onDone: {
                  target: 'idle',
                  actions: [{ type: 'notifyUpsertStreamSuccess' }, { type: 'refreshDefinition' }],
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
          initial: 'displayingSimulation',
          on: {
            'dataSource.change': {
              actions: [
                {
                  type: 'storeUrlState',
                  params: ({ context }) => ({
                    urlState: { v: 1, dataSources: getDataSourcesUrlState(context) },
                  }),
                },
                { type: 'updateUrlState' },
              ],
            },
            'dataSource.dataChange': {
              actions: [{ type: 'sendDataSourcesSamplesToSimulator' }],
            },
          },
          states: {
            displayingSimulation: {
              entry: [{ type: 'spawnSimulationMachine' }],
              initial: 'viewDataPreview',
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
                    ],
                  }
                ],
                'processor.delete': {
                  actions: [
                    { type: 'stopProcessor', params: ({ event }) => event },
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
                'simulation.manageDataSources': 'managingDataSources',
              },
              states: {
                viewDataPreview: {
                  on: {
                    'simulation.viewDetectedFields': 'viewDetectedFields',
                    'simulation.changePreviewDocsFilter': {
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
              on: {
                'dataSources.closeManagement': 'displayingSimulation',
                'dataSources.add': {
                  actions: [
                    { type: 'addDataSource', params: ({ event }) => event },
                    {
                      type: 'storeUrlState',
                      params: ({ context }) => ({
                        urlState: { v: 1, dataSources: getDataSourcesUrlState(context) },
                      }),
                    },
                    { type: 'updateUrlState' },
                  ],
                },
                'dataSource.delete': {
                  actions: [
                    { type: 'stopDataSource', params: ({ event }) => event },
                    { type: 'deleteDataSource', params: ({ event }) => event },
                    {
                      type: 'storeUrlState',
                      params: ({ context }) => ({
                        urlState: { v: 1, dataSources: getDataSourcesUrlState(context) },
                      }),
                    },
                    { type: 'updateUrlState' },
                  ],
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
    updateUrlState: createUrlUpdaterAction({ urlStateStorageContainer }),
    notifyUpsertStreamSuccess: createUpsertStreamSuccessNofitier({
      toasts: core.notifications.toasts,
    }),
    notifyUpsertStreamFailure: createUpsertStreamFailureNofitier({
      toasts: core.notifications.toasts,
    }),
  },
});
