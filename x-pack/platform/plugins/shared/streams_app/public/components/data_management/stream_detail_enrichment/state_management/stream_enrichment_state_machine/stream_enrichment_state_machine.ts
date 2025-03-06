/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  MachineImplementationsFrom,
  assign,
  not,
  setup,
  sendTo,
  stopChild,
  and,
  ActorRefFrom,
} from 'xstate5';
import { getPlaceholderFor } from '@kbn/xstate-utils';
import {
  IngestStreamGetResponse,
  isRootStreamDefinition,
  isWiredStreamGetResponse,
} from '@kbn/streams-schema';
import { htmlIdGenerator } from '@elastic/eui';
import {
  StreamEnrichmentContext,
  StreamEnrichmentEvent,
  StreamEnrichmentInput,
  StreamEnrichmentServiceDependencies,
} from './types';
import { processorConverter } from '../../utils';
import {
  createUpsertStreamActor,
  createUpsertStreamFailureNofitier,
  createUpsertStreamSuccessNofitier,
} from './upsert_stream_actor';

import { ProcessorDefinitionWithUIAttributes } from '../../types';
import {
  simulationMachine,
  PreviewDocsFilterOption,
  createSimulationMachineImplementations,
} from '../simulation_state_machine';
import { processorMachine, ProcessorActorRef } from '../processor_state_machine';

const createId = htmlIdGenerator();

export type StreamEnrichmentActorRef = ActorRefFrom<typeof streamEnrichmentMachine>;

export const streamEnrichmentMachine = setup({
  types: {
    input: {} as StreamEnrichmentInput,
    context: {} as StreamEnrichmentContext,
    events: {} as StreamEnrichmentEvent,
  },
  actors: {
    upsertStream: getPlaceholderFor(createUpsertStreamActor),
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
    storeDefinition: assign((_, params: { definition: IngestStreamGetResponse }) => ({
      definition: params.definition,
    })),
    stopProcessors: ({ context }) => context.processorsRefs.forEach(stopChild),
    setupProcessors: assign(({ self, spawn }, params: { definition: IngestStreamGetResponse }) => {
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
    forwardEventToSimulator: sendTo(
      'simulator',
      ({ context }, params: { type: StreamEnrichmentEvent['type'] }) => ({
        type: params.type,
        processors: getStagedProcessors(context),
      })
    ),
    sendFilterChangeToSimulator: sendTo(
      'simulator',
      (_, params: { filter: PreviewDocsFilterOption }) => ({
        type: 'simulation.changePreviewDocsFilter',
        filter: params.filter,
      })
    ),
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
    isRootStream: ({ context }) => isRootStreamDefinition(context.definition.stream),
    isWiredStream: ({ context }) => isWiredStreamGetResponse(context.definition),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5RgHYCcCWBjAFgZQBc0wBDAWwDoMUMCMSAbDAL2qgGIBtABgF1FQABwD2sWhmEoBIAB6IAtAA4ATAE4K3AGzdlizQBYAjPoCsi7voA0IAJ4KAzIoomT3cwHYdixfferFAL4B1qiYuITE5FQ0dIwsbFyG-EggImJ0ktJyCErGzpqGqoaa7u7KmkWG1nYIyiYUytwmFX7mjZqK+kEh6Nj4RKSUkRA27LADUcRYYBgAbpA8yUKi4pkp2fJ13BSObib6Ksr6+o3u1QrHFO6Kqi6q+h0PBcrd4L3hE0OkIxTjkZQYCAMMBjT4UYiwMAERbSNKrKTrRDKPL6biqVTKTE6AyKExnWyIQz2PImZH7Y76Rz2VSvUJ9CKDcHfGy-MGA4Gg-4UACugggJAIYBhKThGQRoA23mUV3cRJMGMaWiK5wQxl0FBOJnsakMWmJD1p736XOGLL+jN5-LoKA4EEkYGis2EAGsHbzIWgCAzyABBLAEYRoYXLdIScWyBQuexXezcNyqdz6VSaeymFVE1TR-RlZSy3GGYp4w1hY2M02srmWgUJMBoNCBiiCBgCgBmgco7trXs+foDQb4sJWYqyDgLFEzufs2k0zWuePTqM044O2nMqh01y6wTeJe9XxIPzpuDIqAIFAgGFgTZINjYAAV69NYLBA7B2IJH3AX2hYBQDxBg1SIcwxHHJOm2bhSn2TxjmUex7BMFUp3cDVzCnApiR8SCTGLekwXLI8cBPFAzwvK9m1vG0H2EJ9vzfD8aK-V8mUDCBa0A0UQMRHJjiXLUmmpA5KQqQx8RqMwnG4QozDjbUzGKXCPhNZkKEI4jSMva9KKgajaNfd9P2fBs2OBQUOOAtYJQcfYdmg1wkzjbhqSQmzZOudxmiaAxDBw7dCL3JkDxZNTT3PTSKPvQy6IMxijLQVkSBgczQ0siMcmubZ-F8DzikaSlFBVeVo2gjpCk8dzAj8o0AoIo11LC8ibzYPAMDIblmzFGK9J-CgACpkvhUDUSueUigqfY0SkzQVXRPjvFlPF-BMYwtx6Xd8JUkKSIarTmta9rq0kLqmPi-qBxFCzw2yYaPPRYpblRdciRVTpoxW1c-EMNQ0UU0tJk2urQrI3abRatqOrDChZgwMAAHcABEBRIB8wGhuGxn2iHJChmGEahMB-UgAAxGGGAgWABuHbj5BcaVdSwtFTHKE4ZtuVDdQQ5oVFXX6aoBkt6uBiLQcxw6UBxuHEYIZHiDR2GMfBsWKFwEgbTAFG5fhmjYBJhhBX7JYgJSq6FB8fQKG8WNCng65iXsF6imcXMikcUlmkKXmNqC1TAe2oWmpFxWxQlvHBUJiASbAMm3zEIPIc1pGNdxymuKsnJ9mlMabj8eD7hudMtEMHZ3G1ODY2ze5fO3FBhDY+AUn8z5B2N0D5F1NQrgqOCvrlRRjBVNvtQaG5mljdcEPsT2uWocQ4lYG1m8G6n-CL9wu+JZEEL7+2CR47ZzDcRmNzqeDfLWvDlKCxeqbT+QEycS2pMzXwfGe3fdSXNyXALOpF0nqr1qXx+Oacg19U5pTvrGGUcoFRxhEumOCKEEylGxK0MwU8ywqRAQCIEYAwGpQ2JoOC44iGzTRCoL6Vh35yQ1KUdyGdFDuAwf9b22CeR8mrAvC6LdqYGHULKDyWoDCOFzAVd+Lh6hJlRFJbMahkyrR3BfTB3stoEHwSbHImZ95YWti-O2Kpyh8ScmvNe64mb-3PkpZRh5fYaUatpXSJ164hiXrfAokibglGTGibUjDCo6AtlzLQTkfK3DPooqxLCbECyBuFAOUAwYHRvkbVxECpQWx0c-W2b8ageRQhuPwiYiidANAApRUTgq2J2sLBJotg4J2lknOG6jW6lCXPBFa2ZZIVGmrvdEHiOYuA6OUNwzD9zRL6ILOJ2lElY3FprfG4dI7RxadTTE5tn5FUMHoTEahWYDKckM7mWgxlMhfAweYEAABKwhhDdn+KstxRxaGlFEo8PQLNd7yBOBoVwfh3ZTgsH4IIQQgA */
  id: 'enrichStream',
  context: ({ input }) => ({
    definition: input.definition,
    initialProcessorsRefs: [],
    processorsRefs: [],
  }),
  initial: 'initializing',
  states: {
    initializing: {
      always: [
        {
          target: 'resolvedRootStream',
          guard: 'isRootStream',
        },
        { target: 'ready' },
      ],
    },
    ready: {
      id: 'ready',
      type: 'parallel',
      entry: [
        { type: 'stopProcessors' },
        {
          type: 'setupProcessors',
          params: ({ context }) => ({ definition: context.definition }),
        },
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
                  reenter: true,
                },
                'stream.update': {
                  guard: 'canUpdateStream',
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
                  processors: context.processorsRefs
                    .map((proc) => proc.getSnapshot())
                    .filter((proc) => proc.matches('configured'))
                    .map((proc) => proc.context.processor),
                  fields: undefined, // TODO: implementing in follow-up PR
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
          states: {
            displayingProcessors: {
              on: {
                'processors.add': {
                  guard: '!hasPendingDraft',
                  actions: [{ type: 'addProcessor', params: ({ event }) => event }],
                },
                'processors.reorder': {
                  guard: 'hasMultipleProcessors',
                  actions: [{ type: 'reorderProcessors', params: ({ event }) => event }],
                },
                'processor.delete': {
                  actions: [
                    { type: 'stopProcessor', params: ({ event }) => event },
                    { type: 'deleteProcessor', params: ({ event }) => event },
                  ],
                },
                'processor.stage': {
                  actions: [{ type: 'reassignProcessors' }],
                },
              },
            },
            displayingSimulation: {
              entry: [{ type: 'spawnSimulationMachine' }],
              initial: 'viewDataPreview',
              on: {
                'processors.*': {
                  actions: [{ type: 'forwardEventToSimulator', params: ({ event }) => event }],
                },
                'processor.*': {
                  actions: [{ type: 'forwardEventToSimulator', params: ({ event }) => event }],
                },
              },
              states: {
                viewDataPreview: {
                  on: {
                    'simulation.viewDetectedFields': 'viewDetectedFields',
                    'simulation.changePreviewDocsFilter': {
                      actions: [
                        { type: 'sendFilterChangeToSimulator', params: ({ event }) => event },
                      ],
                    },
                  },
                },
                viewDetectedFields: {
                  on: {
                    'simulation.viewDataPreview': 'viewDataPreview',
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
}: StreamEnrichmentServiceDependencies): MachineImplementationsFrom<
  typeof streamEnrichmentMachine
> => ({
  actors: {
    upsertStream: createUpsertStreamActor({ streamsRepositoryClient }),
    processorMachine,
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
    notifyUpsertStreamSuccess: createUpsertStreamSuccessNofitier({
      toasts: core.notifications.toasts,
    }),
    notifyUpsertStreamFailure: createUpsertStreamFailureNofitier({
      toasts: core.notifications.toasts,
    }),
  },
});

function getStagedProcessors(context: StreamEnrichmentContext) {
  return context.processorsRefs
    .map((proc) => proc.getSnapshot())
    .filter((proc) => proc.context.isNew)
    .map((proc) => proc.context.processor);
}
