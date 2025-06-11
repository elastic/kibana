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
  /** @xstate-layout N4IgpgJg5mDOIC5RgHYCcCWBjAFgZQBc0wBDAWwDoMUMCMSAbDAL2qkOPIGIBtABgC6iUAAcA9rFoYxKYSAAeiALQB2PgDYKAJgCMATnXqV6rQFYt6gMw6ANCACeyvXpXa1AFh1qV7gBy+tLQBfILtUTFwOUkpqKUYWNijuHh0hJBBxSToZOUUEJXVfV2dLPj13Sz0dSp1TO0d8vQsKXy8td3ctMqKVFRCw9Gx8ImiqGjp41hQoADE0MTIAVTQGLgBXFbG4pmZIfjTRCSkc9LyCvT4KdSbrPj9C3xN65R93FvVTS3U+FUstUr0-XAg0iI3IFFgYAIaxEAHF5gBrADCYgYDDAWGyKC4EBkYDGADcxAj8ZDoXDESi0Risfs5JljrJTspKlormVOi5dLUXM98qYDBQ9KZ3GVTHxTB8-jogeEhklKGSYfDiVT0ZjpNiwGh5mgKCIGCQCAAzMRoRVQ5WU1Hq2mCelHLG5ZSilp8PhFLRNDl8Cx1BwvDRCnS6QouCU6O6ykHDTiUTgQexcWBg+MYsAYAl7e3pBlO5kIKXaUw6dwlsse9ruPmqdoUUy+DQ+PSWayt6MRWOjBP2CGpqgQdHJ-vEMl03OOzXOhCfK4NyzmIzWR76Pm-N7fZu+FzVfy+DvykekRN9uMDocps8wiBGsDjw5ZKcFpQXYrqaqVFt3R4qPkGNkVC46juMBpaFOoB6gmePanqM15GmwOJ4oSxL4jCkJoAQCoAIKYma94ZJOJygGcpgqL4QpdD8dzfBKuh-lorj3N4liPNYLiQV24IwZecEiDedDTFw2q6vqhommalDodqWGprhBD4TmD6MtOSitq4IaMToRjGGU6h-q6BilBUJgin87icQqFAwXKuBkKgBA4kaJB4GIGxYPiuAkNMd5KYRj7EQoiCRioOgUMYRhsV0DZ6DWIaXIUWgBJYKjil8Jj7qEwKdlZNkxvZKCOQJLluWgHkUMVSI4N5MAEXmT4kcFvpvGWnRJdujGWJ4NZJXoFC1Co5SMcKIqPJZR4kCetk4AVBAVRgsAGiQ9iJBgZBrOJmpcCI8webAsBmrAFCTRAdVEUyjUIBUFEqElZRdcZKX+g0kYtSKZZWO9XpkeN0HHr202zfNi2Git0x4GtG0ITI227XAB1oEdxBmhA2pnQFF1BVdrHhXdLYVHcT18pKFCtR9C4dN9fRZdNuX-RQgMOcDS1g+wkObTDO1iHtCMUF5PnoypBbXbjjb449qV8hRZOShTnKStTAw5RNU35UzEALSzq3rRz2JczzZp89VAupA6GPTuKYW9E07hVF6rQNr+AYIO0lw6CFGhy1Tv3dvTjOFczoPa1DWKw9z8OG6j6IEL5Bz+ULl0i7dYsPYTkvO2pfUiqYZnATnHiWD73F+2rAcayDy3B7rYcG3qKYkLVfn1YFeSdKYFASr6u7+Dn1Q1o84V6P4fghiBwFjTTMZ05NAOl3N5da+D7PQ3rcP7Yb8Ex4L+aJ7U-XOMYajab8Pg9e6-WtIUKXpT4RRF2mM8M3PgeV0vOsr8my9YhQZDeQ3YAABFnKuXcnAbeDUsaqEjBQBc+gdDbngcKZwfJRSaGuJbawpZjB-HvtZEunYgYLyDm-EOmoKAEgwGAAA7kAggJAAAKxAKHUM-u-b+zCaFQhpJAGYlCGAQFgOAluLoc6k3dKKNQnwfAfH0s7W6VxgLfCHj8SU7tC6T2Vn9R+-t56a2IWzNhZCOG0IYUwyhVDWGkJkEbGqYBGFgGMdzWAvCGAxzQEIzGZxfgUS8CWMwHQrDVFkQ0NSYV2oln0B6aovRgK4LygQ9WejX4GKsSgch5iAFcMxDwvhAjLG63SdQkx9iOEeNUiBS4l8vp-EeKGPkpZLivhzm3EURgOIaMPFo1WCSy5JNZhDQx1jjFZJjhAXhYB+GwHySvCgxpclHQAFRlILCFYMgQLDOBLByLQKC+oPD4ClO6DYQLCjifgoYQNf4oAbmwExICypwCcnQ+5e0+YMAkGAAAsn-GAs1lmXVUCWdkuh-AWH8NpZ6iAupvg5EPd2-xagQQ6VBX22jn5XJudMO5pU9pPJKqAo6J1-mQM6JcSs2kx4hguF1XZmgyi7nKBoDQIozlop6XNDFUBbnAJxY84qLz8RRy4cSs4VRLAd10AYCU-g4WWBQQEK4pZHiij+O6dSIQsooDEKjeA6RaapjNgnSBkYyISv0N8Bs25WhyozpGfwbgDm3WuiGUwuDYgTB2IkA1E5zbPjhR3KoZR2j-FbHwWwGdnBZy6JUL4xgyxmDdeMegnrphzAWMsBghqd6QLUNLCw1wrC3QRb4fu3whQlklPdW2ATcFKgpKqG0NIIHN08S6VKF9UrXFtr0JKxgay-DCnbMw-wLjKJlMirilAoDWmpBqGQMwSAYAYBsMAWaIF5GDYPBFhaRR3F6P2j0pNNLfgCGGn4rLExruEfkSMZQzVSstbKms7h20fEGi+92NEFyK2yp01FJ5eLkCva2xooiDAfhKN+Iwa5QpChuD8d8qVfANgvb2QDMRByrp9Uas4wE+q1C9MYRsbEpYClJk0QIpRyK+kqKh2C4JN5sGA6pIwbwmkPRFO0EU9SPRZw9BUNQUTxQWQndPbpFyHLMb9e+e9FqZXWp6kUK4l9UoXHgWBdRSs-3FzZRJ3pFd+lf2bedVS5FNC+JdQEtswTlAQvCj3bkDY7j2zozol+hnBlpOMc5Ep5ipMAraVcf4OcPQemQ6uORbJDAVOUZ2tRrnn5EOSQM1JhTOEx2yWM+Z-njVJW0GYa4TRyiSNqGuKLijugqKUeOrTKKdPibskzTl3Lnm8t1cpbNuGmik2uI8e6XxfCtmJuYDuYaqjkRSmG5DZyDoMCzBAAASmIMQsk4w5bOJUS4IpwNH0bFYOK7pLi9AOY2Ri9tPgaqCEAA */
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
                  },
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
