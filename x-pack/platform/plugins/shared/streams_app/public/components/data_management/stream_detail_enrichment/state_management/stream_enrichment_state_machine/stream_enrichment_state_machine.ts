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

        const newDataSourceRef = spawn('dataSourceMachine', {
          id: dataSourceWithUIAttributes.id,
          input: {
            parentRef: self,
            streamName: context.definition.stream.name,
            dataSource: dataSourceWithUIAttributes,
          },
        });

        return {
          dataSourcesRefs: [newDataSourceRef, ...context.dataSourcesRefs],
        };
      }
    ),
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
    deleteProcessor: assign(({ context }, params: { id: string }) => ({
      processorsRefs: context.processorsRefs.filter((proc) => proc.id !== params.id),
    })),
    refreshDataSources: ({ context }) => {
      context.dataSourcesRefs.forEach((dataSourceRef) =>
        dataSourceRef.send({ type: 'dataSource.refresh' })
      );
    },
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
  /** @xstate-layout N4IgpgJg5mDOIC5RgHYCcCWBjAFgZQBc0wBDAWwDoMUMCMSAbDAL2qkOPIGIBtABgC6iUAAcA9rFoYxKYSAAeiALQB2PgDYKAJgCMATnXqV6rQFYt6gMw6ANCACeyvXpXa1AFh1qV7gBy+tLQBfILtUTFwOUkpqKUYWNijuHh0hJBBxSToZOUUEJXVfV2dLPj13Sz0dSp1TO0d8vQsKXy8td3ctMqKVFRCw9Gx8ImiqGjp41hQoADE0MTIAVTQGLgBXFbG4pmZIfjTRCSkc9LyCvT4KdSbrPj9C3xN65R93FvVTS3U+FUstUr0-XAg0iI3IFFgYAIaxEAHF5gBrADCYgYDDAWGyKC4EBkYDGADcxAj8ZDoXDESi0Risfs5JljrJTspKlormVOi5dLUXM98qYDBQ9KZ3GVTHxTB8-jogeEhklKGSYfDiVT0ZjpNiwGh5mgKCIGCQCAAzMRoRVQ5WU1Hq2mCelHLG5ZSilp8PhFLRNDl8Cx1BwvDRCnS6QouCU6O6ykHDTiUTgQexcWBg+MYsAYAl7e3pBlO5kIb6aL46HRWX7C9x81TWCiWfwBKy+EV3dzRiKx0YJ+wQ1NUCDo5N94hkum5x2a52F0x1yqmLweTrqMt83yWN7Lr06dzXHeN9vy4ekRO9uP9wcps8wiBGsBjw5ZScFpS+QVaXx8Lx+ZztIx8yMmBQHTzh+XzuMY-wHqCZ7dqeozXkabA4nihLEviMKQmgBAKgAgpiZr3hkE4nKAZySq4-yvhKnT+CGtgBggkZaK47hNCGtwGNUbahMCHYKhQsGXvBIg3nQ0xcNqur6oaJpmpQGHathqZ4QQBE5g+jJTkofwzh0tTzq8zbfFWDGRq6Bi+O4Arrp6y5QZ24KwXKuBkKgBDrJssD2CgWCEXmT6kYgKjzkKnjmHoYEmOu1aWPWQp3KYnyWMYhivuo9n8U5MauSg7miSQeBiBsWD4rgJDTHe6lEY+JEKIgkZrkB4HCtUIFetWXRXL0oofsxPwWJYGVHiQJ7OTgOV5UaBVFWgJUUPlSI4OVMB+cRTKBYxfBfBQrWVKylQ+NWOivjt5jmN4gQiuUQ0wcePZjRN80YLABokPYiQYGQawyZqXAiPMJWwLAZqwBQI0QKtNXrXVCBWZcopNKYlnLkYwV8l0bxWXono-L0-yBDdXZ3RQD1uU9L2Gu90x4J932ITIf0A3AwNoKDxBmhA2qQ5pBZw0BZRmMjZa9P6DS1JoWM470Kj48EPFjZlxOk7l5OvVT7C0z9DP-WIgMsxQZUVdz+YbXzCOCzuwto6ZHpAQKUt438csDHxw2jdlZMQM9asfV9WvYjretmgbS1G6kDpQ1O86WEBxnbmWkaJb4fLrpcpabl00v44TjlKx7KtexTb2+3TWKM7rzPB5z6IEJVBzVTzpvivziNC6jouIN8dvYzLuMy07OdpiN935wQquUyX-vl0HeopiQK1Vf5tV5BUmi-NUKivvoKhVMx-4x10HxGPbJhFNd8sxorw8k6P4-F9Tmv0wHTNA8HCG18bAUw0uLQfhFGM716JYDu+RIxpwgoUT8sVWgEwvq7W619lZj0Lj7B+fsn7JkfliCgZByrzzAAAESmoVYqcBP7L2UNcXwXUfifH8L0fQeg+TijXu6Gia4PySksoPASecOyPRQRPNBpdNQUAJBgMAAB3IhBASAAAViDiKkZg9B2ClHSKhDSSAMwJEMAgLAch0MzgdBjiofQ7QuiXQ0Oof8MsaG+kSqUZsfgeFZX4Z7b2QiNaqNEeomR8jFESMkSokRMgQ7LTAAosAfjdawB0QwWuaBDFaRlhLCKBg7i1B+F8PkhQKBmOuFtVo84k6AjgYeBB7t3EF08ffbxoSUBiKCQQzRmJtG6P0SE-2TSpH+Kieo5Jz4Oh6B2sA5K3oyyBC0OjcyIYDDOE3sYSZri+FDAEbU9WNMfFhL8a02uEAdFgD0bALpT8KDGg6aDAAVIMjapYRnWVZL6KwrFKj-lYlcCKVlShFM3sAlZiDb64JQPPNg-iSGzTgDiYhM1AYGwYBIMAABZPBMAJq3JhjWEZbFfR-GSqYYwICOjFEMF8RxVkzDO14hUomgLqlj2BaC6Y4LYVQvyhCuF4MMXGNtqKMozgrDunFDkhiApNBlEgfOL0wCykuxpbnOlayyaMqgGCmFpCTnstZfNI5mjuVOE-HWUUO9EoEp8NUZhAQriWMAYlL0fQgQoDEJzeA6QFapgjo3TFZkZypxNYlbqFqGJKAatQvqFRhSZIJb4HhsQJg7ESB68ckdnzYx0BQMokYmidFiqUeiDQlDOAeV0PaRh1AUtMLG8Y9AE3TDmAsZYDBPUm0xWoahS5rjlkCNYZOwbHiXBapKMo65yg7h4UqCkqobQ0i-kvIxLpgo7SKJKcoLgZZFBscG9ewZLr-AuNjT8PCoDWmpBqGQMwSAYAYBsMAzav55Asfkm4ZZ8WinAioasbagIhgxv4LokYHVyugrSxMd6KGNBcEan4woA3mssNWM6-NiX1i8IlKwAKTxCXIGB+djQOjaA-F+V82a-wMSKOmhZHDCgVl6BhnsWGYgDlvcmr1ZxyxATMa0BcFY+TChGaxYw9ZCPWGMHRuC4J35sBw1pUl2gBrXDxUKkyYtjoPOqM2Zi1gOjcSAw5IeVSlW5Wk6mj5fqYNms8PB4Nx1XBlpHaKSB2NBrlOAwqgzLkPFF02Vg2da0Uk+CAukuO4pfiboLR8fJa5PxwwMJ4WV1LXP6ZHvSu+3ntmNL8VNfpQTjMbQKEYUKlEzVLP0LYtkRh3RmE+B6EUMaXN6d4YqjzNSvOTzObs2ubSDmXNy96ssFARTfKXOuD4x0yv2Kq04kUkoxNIJwaitVsiOVwF62xj8kXHh8d9CY5TndzAZuybFId1hYG6cVsDBgWYIAACUxBiCUnGVbLILgDdYsuNQx0NBWYLWAy4vQim+hltjT4IQQhAA */
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
            { type: 'updateUrlState' },
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
                { type: 'updateUrlState' },
              ],
            },
            'dataSource.change': {
              actions: raise({ type: 'url.sync' }),
            },
            'dataSource.dataChange': {
              actions: [{ type: 'sendDataSourcesSamplesToSimulator' }],
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
    updateUrlState: createUrlUpdaterAction({ urlStateStorageContainer }),
    notifyUpsertStreamSuccess: createUpsertStreamSuccessNofitier({
      toasts: core.notifications.toasts,
    }),
    notifyUpsertStreamFailure: createUpsertStreamFailureNofitier({
      toasts: core.notifications.toasts,
    }),
  },
});
