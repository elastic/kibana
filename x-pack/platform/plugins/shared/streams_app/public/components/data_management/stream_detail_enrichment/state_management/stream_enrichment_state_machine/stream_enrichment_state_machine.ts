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
  setup,
  sendTo,
  stopChild,
  and,
  ActorRefFrom,
  raise,
  cancel,
  stateIn,
} from 'xstate5';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import { isRootStreamDefinition, ProcessorDefinition, Streams } from '@kbn/streams-schema';
import { GrokCollection } from '@kbn/grok-ui';
import { EnrichmentDataSource, EnrichmentUrlState } from '../../../../../../common/url_schema';
import {
  StreamEnrichmentContextType,
  StreamEnrichmentEvent,
  StreamEnrichmentInput,
  StreamEnrichmentServiceDependencies,
} from './types';
import { getDefaultGrokProcessor, isGrokProcessor } from '../../utils';
import {
  createUpsertStreamActor,
  createUpsertStreamFailureNofitier,
  createUpsertStreamSuccessNofitier,
} from './upsert_stream_actor';

import {
  simulationMachine,
  createSimulationMachineImplementations,
} from '../simulation_state_machine';
import { processorMachine } from '../processor_state_machine';
import {
  defaultEnrichmentUrlState,
  getConfiguredProcessors,
  getDataSourcesSamples,
  getDataSourcesUrlState,
  getProcessorsForSimulation,
  getUpsertWiredFields,
  spawnDataSource,
  spawnProcessor,
} from './utils';
import { createUrlInitializerActor, createUrlSyncAction } from './url_state_actor';
import {
  createDataSourceMachineImplementations,
  dataSourceMachine,
} from '../data_source_state_machine';
import { setupGrokCollectionActor } from './setup_grok_collection_actor';
import { selectPreviewRecords } from '../simulation_state_machine/selectors';
import { moveArrayItem } from '../../../../../util/move_array_item';

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
            processors: getProcessorsForSimulation(context),
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
    setupProcessors: assign((assignArgs) => {
      // Clean-up pre-existing processors
      assignArgs.context.processorsRefs.forEach(stopChild);
      // Setup processors from the stream definition
      const processorsRefs = assignArgs.context.definition.stream.ingest.processing.map(
        (processor) => spawnProcessor(processor, assignArgs)
      );

      return {
        initialProcessorsRefs: processorsRefs,
        processorsRefs,
      };
    }),
    addProcessor: assign((assignArgs, { processor }: { processor?: ProcessorDefinition }) => {
      if (!processor) {
        processor = getDefaultGrokProcessor({
          sampleDocs: selectPreviewRecords(assignArgs.context.simulatorRef?.getSnapshot().context),
        });
      }

      const newProcessorRef = spawnProcessor(processor, assignArgs, { isNew: true });

      return {
        processorsRefs: assignArgs.context.processorsRefs.concat(newProcessorRef),
      };
    }),
    deleteProcessor: assign(({ context }, params: { id: string }) => ({
      processorsRefs: context.processorsRefs.filter((proc) => proc.id !== params.id),
    })),
    reorderProcessors: assign(({ context }, params: { from: number; to: number }) => ({
      processorsRefs: moveArrayItem(context.processorsRefs, params.from, params.to),
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
        processors: getProcessorsForSimulation(context),
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
    canReorderProcessors: and([
      'hasSimulatePrivileges',
      ({ context }) => context.processorsRefs.length >= 2,
    ]),
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
    hasManagePrivileges: ({ context }) => context.definition.privileges.manage,
    hasSimulatePrivileges: ({ context }) => context.definition.privileges.simulate,
    canUpdateStream: and(['hasStagedChanges', stateIn('#managingProcessors.idle')]),
    isStagedProcessor: ({ context }, params: { id: string }) => {
      const processorRef = context.processorsRefs.find((p) => p.id === params.id);

      if (!processorRef) return false;
      return processorRef.getSnapshot().context.isNew;
    },
    isRootStream: ({ context }) => isRootStreamDefinition(context.definition.stream),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5RgHYCcCWBjAFgZQBc0wBDAWwDoMUMCMSAbDAL2qkOPIGIBtABgC6iUAAcA9rFoYxKYSAAeiALQB2AIwAWChoAcAZgBMavgY16ArGsMAaEAE9lxgGx8KKlUYCcV85afmNAF9A21RMXA5SSmopRhY2SO4eNSEkEHFJOhk5RQQlJ08nCgNzJyc9FT4+Qo01J1sHPM9PVz01FrUdDQ6XT2DQ9Gx8IiiqGjo41hQoADE0MTIAVTQGLgBXFbHYpmZIflTRCSlstNz8zx0KT18dcza+Sz1yhuUdPkun9Qs+NRLPAz0-XAgwiI3IFFgYAIaxEAHF5gBrADCYgYDDAWCyKC4EBkYDGADcxAj8ZDoXDESi0Risfs5BljrJTsoNFUKDoVHo+Hpak9fHcXnknN0KMY1KUdMYSuZPCogWEholKGSYfDiVT0ZjpNiwGh5mgKCIGCQCAAzMRoZVQ1WU1Ga2mCelHLE5FmeCh8YW1Xx6bwtPQ6QWqSraKyeMwlPgqTxPeUg4acSicCB2LiwMFJjFgDAEvaOtIMl1pRpKO4GbTNDQGcPCyztWy5MNFHnGPRtcUXIIhYHhBOjZN2CEZqgQdFp4fEMl0gvO7WuhBlNSipwcwwqJwGFTmAyB+yINTGcxuC7VTfmHSSjRdga9pUUAdDxMjsfpp8wiAmsDTw6ZOfMvJVkeuilH6ZhOL8grGNcFDlC0fDei4F5xreE6kCmj6jO+JpsDieKEsS+IwpCaAEEqACCmIWt+6SzicoBnIU2hXlWpicmo7gWJBnquCuMoaAUVQxt4yGKqhJDoa+mEiB+dDTFwur6oaxpmhalBEbqpEZhRBBUfmP6MvOmhHhY1ZtEYUYqKuXEqFodQGDubSsg8nQiaCT4PgquBkKgBDrJssB2CgWDUYWf70YgARFJWdRch4mhdIKhgep0K46Bc24yu4rl9uCHnxt5KC+TJJB4GIGxYPiuAkNMX56TRv50QoEUAsU4bXMKnrtNGQZWK4VgGOBhR-Nc2V3nlvYFUVJolWVaAVRQxVIjg1UwCFtFMuFCAaFuVw6KYwqdIUMqaEGXJaEYPI2RdMorqNYnoZ5OCTQtGCwEaJB2AkGBkGsynalwIjzBVsCwBasAUOJEBrQ1G1NXkFR6KKXgcrU+i9PUe7w2YbgPACUZcuY8Fyt2j1jWhg6Pc9ECve9n3THg32-dhMgA0DcCg2g4PEBaEC6tDBn-qWS7mOoGgBDy3Q6INp3Y5U26xQTRN3e55MUJTPkvW9xp0+wjN-SzgNiMDHMUFVNX80Wm3nOWdS+PFNnqNcMuI3LeOcg8Ssk-GZPiRT+Ua9TWsfV9P369ihvGxaEIkLmFthXDSj-CorUxeu-rsWozs4-L+Me9t5jK-2qvq4Vmu0yHTNYmmevMyg95gKak44HHjWNvoMHrr6tzruB3K7iWnQ2+47ybntvxlE4he5cX-ul4H5f0zXWIUASGBgAA7gAItNAAKxCrxv1eh7XK9r1vUI0pAMxrwwECwC3sNnMKiOdOeNmHvZBiCiu2jqBx-jpQeFPTMvs1azwIGXbWFcw6nw3tvAgJA95gAPuvI+ldtSm2WjVJBKDN5G1gNfBgBA+Z1VCq3ZQ-wjyFAeP8bo7g0qnSApKHkbwbi6GvD2USKtQElwgfPKBi9j7L1wbvfeZ9WbILPlSNYZAUDgwAFQP3nKWC4FAAjeHKNyboXIv6Y0Tpca4xgPDnisBeAawD648PAZA4Ogj0EyFgefYhmIr43zvmgmBIiEE4LPkowWwpLguAMD8X4XQ2zrkgk8Nwmh1CSgsiLHkFjxpDCpjTARushEYNwRfFxEBr5gFvrADxJ9TRuIUX4q20Z2SclMFUUofJZSCjFhWbcITDAo09EkmeE0NZkGqiQKAbB4EzXKnAU2DAJCQBxNNUqozwZiBEKgAAsv0mAk0KkJ1oaKK6f8PDlE5E0pKlQWgchFlGH4fQvYoW4Q9axfSUADKGTM2awMKALNQNMhBsy5pjKwBMyEKyHlrJ8hsp+RyLzuFlL6QoG5DnlmOe8LclRKjtC6VYnppd7mPOmMM75rz3nYmKnisZkNQWvA3FcXi4EAxlAloKUoUU2JOEsrUcMaLbkYogViwZOLnlzLeYswlfKfkLQKRfMlQpPQwXDE8KsB4oUaHpeUdkV51znhlFUXQ7K-acooNytge8jbszBs+MArMjUgxNaS0h61lHigPMUbcll1w2VuDGHqMEdwmFqNKEe4EC5XK4UXdFKTemrINWzS1nNTXmsjtG7maBeZoAlUoe1S4SijxdcBd1eiRQbjeKYX4vg-XarAbq-V0xDVxvBlgTgskoCxuNQaWAMdaoHHqgLK28UlzlFKFUdi2a9CRK0CYPaJQUbdDqDoUtvC9XhsrZGjmNa604Qjk2021UKoMBTd2mCFgXA-FdTKIdmNTDlhcL2xFV4NHTsDW5YNHLQ2YvnVAKtTbl2kHrY2qNatqYEB3boHt+7+1HpzY0AmopPTfAnd4YmN4g3TxDV5MNQKI0WqXabFdck10-rNqtG1MM7WAb3X2w9g7ErMpglBwmMH2IzruS+t9UbwaQCkNhxdVqIBQwI52hOmhvAeghSUAdbqT2NG2kUToqq37Xro3enKIDH3Iefahhd6GTWsa-Thk2vN0TEIAwJ94HJhOgbE4gcCS4uhRnHTZSdcHOH3sQ0pp6KHsWvo49GzTq6PPR1jjxy2fHJ2CeM5YUzQZZSeoLT64te1J7yZ9s556Fb3Pqc83+7zqWN1BQKQZpcRnjEiePT1Zp+bvVFpo+YoEKAxC83gGkUmGYnSEcFp0KWbgnUcmZeRvRB5LBuDintKMaU-gWJiBMHYCRGszma1bC47oLD8W+N6AtPUoMensnUaMpROTnlG+MegE3phzAWMsBgTXeNnHUEUASAI0otEA54cLphtB3DbNucU9lowWJVBSdUdoaTxzIY-Fk7cxYHl+L12UF5FV6K26GVkA1mXj0SfF4cUBbTUi1DIGYJAMAMA2GAc7AXcgAi0NuDknIkXin4uYIM7glzeF9NGOyplLnwcc4pxo+lieOH0JcLcmauuiaDMdbOphVyyjKBwhrNzBySXIET+OZxtqI2AgUdoYEIKYxaEedoB49q+BsrKezMuH1y+HBgUchPpsXccGUDuNSzHsV8CUQUzRz3eH4n8AaZhASo9lxhcEWF62K-IXkdo5YzCtfKMyionpaeY1+PZHGLr-CfYKLe9nCnLGJZ8qH4H4foyuAF86oXRXc1tGKLjJ4bQCiVE6f7s3Zan18LSbYjJ9jYZA+UVCylNDTDG4YXogEqu6zcmaIJBb9HdX8PbwzTJDivGILERvfPyipbJ1ZB0SyLg1xmYXJcba7FOQANuEAxvTmdUt5sTrefnfHGbxycQvJZS1+C1r8lA8tL+KdAeN-Q-uyDSZ+m40+1+yWuKLycAb+s2Hg2yVYuyA0CMgoiOFAXIlYJQlk541YoBymXKL6EB-KfykyEA0BCcK4yc-gC21YF4aMmcmMFgiMbw7uXg3qe00u3s90V+uBc6qmUABBPy8ygqpBT8kobgbBJilQ5QAI9K3IxQD23I4u8qcWWeCWXBLmKmbmTGS6whjgV07WguYWw+bYSMbw3IlO7ETwbODm2eyS3ByWWhJqlu6IOh4eBQWgJenWhhA8kWZWvqsW4oOB6heBvBDh0atan6bALhqabh+hpeXh+4SUHI7QBQrSG46ggRSWjGHmLG6W0wURdQ4YsRnh3WjQA0ycFQyRtezKG4AaKhqEoMDAuYEAAASmIGIJpImFEV3OyFYB2DHm0G0KtsKMUHFAED6ANFLMEMEEAA */
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
            managingProcessors: {
              id: 'managingProcessors',
              initial: 'idle',
              states: {
                idle: {
                  entry: [{ type: 'sendProcessorsEventToSimulator', params: ({ event }) => event }],
                  on: {
                    'processor.edit': {
                      guard: 'hasSimulatePrivileges',
                      target: 'editing',
                    },
                    'processors.add': {
                      guard: 'hasSimulatePrivileges',
                      target: 'creating',
                      actions: [{ type: 'addProcessor', params: ({ event }) => event }],
                    },
                    'processors.reorder': {
                      guard: 'canReorderProcessors',
                      actions: [
                        { type: 'reorderProcessors', params: ({ event }) => event },
                        { type: 'sendProcessorsEventToSimulator', params: ({ event }) => event },
                      ],
                    },
                  },
                },
                creating: {
                  id: 'creatingProcessor',
                  entry: [{ type: 'sendProcessorsEventToSimulator', params: ({ event }) => event }],
                  on: {
                    'processor.change': {
                      actions: [
                        {
                          type: 'updateGrokCollectionCustomPatterns',
                          params: ({ event }) => event,
                        },
                        { type: 'sendProcessorsEventToSimulator', params: ({ event }) => event },
                      ],
                    },
                    'processor.delete': {
                      target: 'idle',
                      actions: [
                        stopChild(({ event }) => event.id),
                        { type: 'deleteProcessor', params: ({ event }) => event },
                      ],
                    },
                    'processor.save': {
                      target: 'idle',
                      actions: [{ type: 'reassignProcessors' }],
                    },
                  },
                },
                editing: {
                  id: 'editingProcessor',
                  entry: [{ type: 'sendProcessorsEventToSimulator', params: ({ event }) => event }],
                  on: {
                    'processor.change': {
                      actions: [
                        { type: 'sendProcessorsEventToSimulator', params: ({ event }) => event },
                      ],
                    },
                    'processor.cancel': 'idle',
                    'processor.delete': {
                      target: 'idle',
                      actions: [
                        stopChild(({ event }) => event.id),
                        { type: 'deleteProcessor', params: ({ event }) => event },
                      ],
                    },
                    'processor.save': {
                      target: 'idle',
                      actions: [{ type: 'reassignProcessors' }],
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
