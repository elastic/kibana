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
  getUpsertWiredFields,
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
  /** @xstate-layout N4IgpgJg5mDOIC5RgHYCcCWBjAFgZQBc0wBDAWwDoMUMCMSAbDAL2qkOPIGIBtABgC6iUAAcA9rFoYxKYSAAeiALQB2PgDYKAJgCMATnXqV6rQFYt6gMw6ANCACeyvXpXa1AFh1qV7gBy+tLQBfILtUTFwOUkpqKUYWNijuHh0hJBBxSToZOUUEJXVfV2dLPj13Sz0dSp1TO0d8vQsKXy8td3ctMqKVFRCw9Gx8ImiqGjp41hQoADE0MTIAVTQGLgBXFbG4pmZIfjTRCSkc9LyCvT4KdSbrPj9C3xN65R93FvVTS3U+FUstUr0-XAg0iI3IFFgYAIaxEAHF5gBrADCYgYDDAWGyKC4EBkYDGADcxAj8ZDoXDESi0Risfs5JljrJTspKlormVOi5dLUXM98qYDBQ9KZ3GVTHxTB8-jogeEhklKGSYfDiVT0ZjpNiwGh5mgKCIGCQCAAzMRoRVQ5WU1Hq2mCelHLG5ZSilp8PhFLRNDl8Cx1BwvDRCnS6QouCU6O6ykHDTiUTgQexcWBg+MYsAYAl7e3pBlO5kIa56bTqDoi0tedzOPmqawUSz+R4R9wqLx9ULAiKx0YJ+wQ1NUCDo5MD4hkum5x2a535HTVYumWqGYWN-T+ho+SzsvjWdwivQBUymaNdhUUXv9uOD4cpq8wiBGsATw5ZacF1S+S5VnQVLpqLQ+Hyc6thQ7iGGUfwdKy7gnvKo6kIml6jPeRpsDieKEsS+IwpCaAEAqACCmJms+GRTicoBnHuOigeKOgmAKB6VF8QHVJoi6lJYAq+E0FTHh2cqgleF63shIgPnQ0xcNqur6oaJpmpQOHavhqZEQQJE5i+jIzkoXTFh8WifjxtT+H8KisVWQo8ZYKiBEZXEmLBQk9ghfaCTgZCoAQ6ybLA9goFgpF5m+lGIHotkUB6pitB87pHlYQFfNo9EXN+YHCr6znduCF4eV5KA+RJJB4GIGxYPiuAkNMT5aWRr4UQo4U6L4bq+KYxh8CGPyPDWby6Ky3yeN8JiVNlZ55TGBVFUaJVlWgFUUMVSI4NVMDBeRTJhQgRQ0VW3G7VYdxaDW9FbsKYG6D87QJeN8EkIh+XeUtGCwAaJD2IkGBkGs8malwIjzBVsCwGasAUA9EAbQ1W1NQgZagQ2Zjci2ah6KxxZVp4xkfI8MUygJMYTW5FBPYVL1vYan3THg32-ahMgA0DcCg2g4PEGaEDatDOkFsNVzOFUPjdN466INYBkhl87rqC1JgWHdwkk2TBAU+91PsHTf2M4DYjA6zFBVTVPP5ttnRst8-x3C4w0SjWIoltY7VVv4IoqAYiuuQ97lTc9ECverX0-dr2K6-rZqG6txupA6MMzoElzih8HUmPoljWGLs4RW67ufAeGhNr4nu5crvvk-7lMfUH9NYkzessxHXPogQtUHPVvPbUokZvPoBgRQNpk-DWCcUMYc4hrLHy9DBhOnvdj1l6rFeBzTWsM6HzMgxHKYkOtdUhY1VFztoLjpxo1hmOU6jDz82i+Huray0ZjydMXabe6Ti9q1T1ch3X4d6hQi3E2oU4aqDMBQSMRgfx3CMO7SwN9XBGT3OnL0jxrA+DfueUuXZprfyrqvYO69kxryxNg40Y4cAgMPogaoNFehT2cEYUUko+Q1CuJUe+B5J4thngMOeSsP4q3wRrWmRCyEEgwGAAA7gAEVmgABWIJImRJDxGagoCouRUIaSQBmFIhgEBYDUNhlRCoo99DtC6IEJO18AwIDaFcNQvojylGdkXWecFBEL1wX7AOP9CE1w0Vo+RBASBKLAFotRQSZCRzWmACJIS9awH0QwFuaATG6TspoKslQhq1B+CxexhQLHXB3K0RcR4eJYMmr48u-iCGa3UbEkJOjMR6IMUY6JIdNFSLkYo5RfTMnvg6MWaonx3ZdHovZPk7RLhVC9EWFQRRJ7BE8S5EuQiv7LwCU0mJKBekyNkW0luEB9FgEMbAbp68KDGk6eDAAVMM7ac4FwRVZL6KwuT0b2J-AZCKKD3QNmWVxGpOChh4LINVXebBQlzXKnAQ2DAJCQBxLNUqCLwZiBEKgAAstCmA01nlgLsm8bwVgDA8SaCdexnxNAXF+JUDoXgNBrP4V4r2PiIXPShSgGF0w4UYoWoi7FqA0VhKFcDJFKL8V8sJd5YlVF071kCD+YwHUzBlD5HSoUhSmWeDUE5dZOV35ctwJCglsL0XzSlaK7ExVJWIshoq5Qhgtx0SaBFHcVQfkNGgZA1sngXAhnKBUMFWy6mq15fyqAgqbUipxfa61CKloXJ0S6-IookEAV+LoL0Zh3Z2L9SUu4pQ2ylHdFUEIHYUBiC5vAdIHkFSxw7mAqWpgKCVOXDFfwa5ToelagBcpe5AiVB+Fg2IEwdiJFTC202YCDw0TKJGXi-wz62HsUoQWnaujMSMKWcw-F2UbJiOMeg07phzAWMsBgc7QFnDUK1Toy4rB2X+C1GsTYhRdogljMCWClQUlVDaGkoCD6mJdCoDtLUoPXCrL0Iyxgay-Bogs5GY784E2PSaigUBrTUg1DIGYJAMAMA2GAO9NCEBWNHjcM6UHRSo2Qx6UCIYuh+ACF1cdxribe0oxB2cMHO1LmuD21owo+rlFHrLaoNieq+EsOGxColyD8d0gEJ9VRfw-F9IBexi6ootTdhUWor8ePzz7CpmIQ4KOTjju+cwNFCilDDH4A1CDfkF2E+1RchQOS9CU5ZgcQC2BqYcy2RGxgLBYx3ABICaDO2WBbB8GTPxPCBc-pGsLncAhsm+fk8Uvwi0shYxYcehQPhMQy8InZjSxH7OyySnwoEIoGDuAUorNYPijwU91O4vpdDmGq9shpojSHBL6XCxJfTGtnEMMUToDYOoMNeUBOyTj3RmE+NFPww3I0iN-jc1pLd2lnPubN5Qc52JliSxYJLHwP2-PW0YTbriduSj29y8m0aoBWolfGht2l50PvW+SvJVLAhsLUJ2j0qVWgtQyp981PLLUCuTcK8GWBkWQggBdzN-hIGPCqGUDQ3VfB8j3K1d0rRhZP0PYp8z3ifb7Z+39+FGOKB2rx0oPwbIM4BG+EUKozm+TfFcB0UsnQ1yxTZZ2DlJdQYMCzBAAASmIMQqk4zc7HZ2qsss1AtXPv290o81ANl02gz41aghAA */
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
